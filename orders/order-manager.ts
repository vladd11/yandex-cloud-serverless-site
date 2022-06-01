import {TableClient} from "ydb-sdk/build/cjs/table";
import {JSONRPCError, requiredArgument} from "../exceptions";
import {loggable} from "../rpc";
import {AuthorizedContext, authRequired} from "../auth/auth";
import * as crypto from "crypto";

import {OrderItem} from "../types/product";
import priceToNumber, {longToNumber} from "../priceToNumber";

import {OrderQueries} from "./queries";
import staleReadOnly from "../staleReadOnly";

class CartIsEmpty extends JSONRPCError {
	constructor() {
		super("Cart is empty", 2000);
	}
}

class InvalidPaymentMethod extends JSONRPCError {
	constructor() {
		super("Payment method not found", 2001);
	}
}

const paymentMethods = {
	cash: 0,
	card: 1
}

export default class OrderManager {
	private client: TableClient;

	constructor(client: TableClient) {
		this.client = client;
	}

	public async addOrder(params: {
		products: Array<OrderItem>,
		paymentMethod: string,
		phone: number,
		address: string
	}, context: AuthorizedContext) {
		loggable("addOrder", context)
		authRequired("addOrder", context)

		requiredArgument("paymentMethod", params.paymentMethod)
		requiredArgument("products", params.products)
		requiredArgument("phone", params.phone)

		if (params.products.length === 0) throw new CartIsEmpty()

		const paymentMethod : number = paymentMethods[params.paymentMethod]
		if(!paymentMethod) {
			throw new InvalidPaymentMethod();
		}

		const id = crypto.randomBytes(16)

		params.products.forEach(value => {
			value.orderItemID = crypto.randomBytes(16)
		})

		const result = await this.client.withSessionRetry(async (session) => {
			return await session.executeQuery(
				await session.prepareQuery(OrderQueries.insertOrder),
                OrderQueries.createInsertOrderParams(params.products, context.userID, id, params.phone, paymentMethod)
			)
		})

		return {
			id: id.toString("hex"),
			price: priceToNumber(result.resultSets[0].rows[0].items[0].uint64Value),
			redirect: (params.paymentMethod === "cash") ? null : "https://google.com"
		}
	}

	public async getOrder(params: { orderID: string }, context: AuthorizedContext): Promise<{
		phone: number;
		price: number;
		products: {
			ImageURI: string;
			quantity: number;
			Price: number;
			Title: string
		}[]
	}> {
		loggable("getOrder", context)
		authRequired("getOrder", context)
		requiredArgument("orderID", params.orderID)

		return await this.client.withSessionRetry(async (session) => {
			const result = await session.executeQuery(
				await session.prepareQuery(OrderQueries.getOrder),
				OrderQueries.createGetOrderParams(Buffer.from(params.orderID, "hex")),
				staleReadOnly
			)

			const order = result.resultSets[0].rows[0];
			const userID = order.items[4].bytesValue;

			// If userID in context == userID of order
			if (Buffer.from(userID).equals(context.userID)) {
				return {
					phone: longToNumber(order.items[5].uint64Value),
					price: priceToNumber(order.items[3].uint64Value),
					time: order.items[6].uint32Value,
					products: result.resultSets[1].rows.map(value => {
						return {
							Price: priceToNumber(value.items[0].uint64Value),
							quantity: value.items[1].uint32Value,
							ImageURI: value.items[2].textValue,
							Title: value.items[3].textValue
						}
					})
				};
			}
			return null;
		})
	}
}