import {TableClient} from "ydb-sdk/build/cjs/table";
import {JSONRPCError} from "../exceptions";
import {loggable} from "../rpc";
import {AuthorizedContext, authRequired} from "../auth/auth";
import * as crypto from "crypto";

import {OrderItem} from "../types/product";
import priceToNumber from "../priceToNumber";

import {OrderQueries} from "./queries";
import staleReadOnly from "../staleReadOnly";

class CartIsEmpty extends JSONRPCError {
	constructor() {
		super("Cart is empty", 2000);
	}
}

export default class OrderManager {
	private client: TableClient;

	constructor(client: TableClient) {
		this.client = client;
	}

	public async addOrder(params: {
		products: Array<OrderItem>,
		paymentMethod: string,
		address: string
	}, context: AuthorizedContext) {
		loggable("addOrder", context)
		authRequired("addOrder", context)
		if (params.products.length === 0) throw new CartIsEmpty()

		const id = crypto.randomBytes(16)

		params.products.forEach(value => {
			value.orderItemID = crypto.randomBytes(16)
		})

		const result = await this.client.withSessionRetry(async (session) => {
			return await session.executeQuery(
				await session.prepareQuery(OrderQueries.insertOrder),
                OrderQueries.createInsertOrderParams(params.products, context.userID, id)
			)
		})

		return {
			id: id.toString("hex"),
			price: priceToNumber(result.resultSets[0].rows[0].items[0].uint64Value),
			redirect: (params.paymentMethod === "cash") ? "https://google.com" : null
		}
	}

	public async getOrder(params: { orderID: string }, context: AuthorizedContext): Promise<{
		phone: string;
		price: number;
		products: {
			imageURI: string;
			quantity: number;
			price: number;
			title: string
		}[]
	}> {
		loggable("getOrder", context)
		authRequired("getOrder", context)

		return await this.client.withSessionRetry(async (session) => {
			const result = await session.executeQuery(
				await session.prepareQuery(OrderQueries.getOrder),
				OrderQueries.createGetOrderParams(Buffer.from(params.orderID, "hex")),
				staleReadOnly
			)

			const orderAndUser = result.resultSets[0].rows[0];
			const userID = orderAndUser.items[4].bytesValue;

			// If userID in context == userID of order
			if (Buffer.from(userID).equals(context.userID)) {
				return {
					phone: orderAndUser.items[5].textValue,
					price: priceToNumber(orderAndUser.items[3].uint64Value),
					products: result.resultSets[1].rows.map(value => {
						return {
							price: priceToNumber(value.items[0].uint64Value),
							quantity: value.items[1].uint32Value,
							imageURI: value.items[2].textValue,
							title: value.items[3].textValue
						}
					})
				};
			}
			return null;
		})
	}
}