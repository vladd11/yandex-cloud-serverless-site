import {TableClient} from "ydb-sdk/build/cjs/table";
import Queries from "./queries";
import {JSONRPCError} from "./exceptions";
import {loggable} from "./rpc";
import {AuthorizedContext, authRequired} from "./auth";
import * as crypto from "crypto";

import {OrderItem} from "./types/product";

class CartIsEmpty extends JSONRPCError {
    constructor() {
        super("Cart is empty", 2000);
    }
}

export default class OrderManager {
    private queries: Queries;
    private client: TableClient;

    constructor(client: TableClient, queries: Queries) {
        this.client = client;
        this.queries = queries;
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

        await this.client.withSessionRetry(async (session) => {
            await session.executeQuery(
                await this.queries.insertOrderItems(session),
                this.queries.createInsertOrderItemsParams(params.products, id)
            )
        })

        const price = await this.client.withSessionRetry(async (session) => {
            return (await session.executeQuery(
                await this.queries.insertOrder(session),
                this.queries.createInsertOrderParams(params.products, context.userID, id)
            )).resultSets[0].rows[0].uint64Value
        })

        return {
            id: id.toString("hex"),
            price: price,
            redirect: (params.paymentMethod === "cash") ? "https://google.com" : null
        }
    }

    public async getOrder(params: { orderID: string }, context: AuthorizedContext): Promise<{
        phone: string;
        price: number;
        products: {
            imageURI: string;
            quantity: number;
            price: number | Long.Long;
            title: string
        }[]
    }> {
        loggable("getOrder", context)
        authRequired("getOrder", context)

        return await this.client.withSessionRetry(async (session) => {
            const result = await session.executeQuery(
                await this.queries.getOrder(session),
                this.queries.createGetOrderParams(Buffer.from(params.orderID, "hex")),
                this.queries.staleReadOnly()
            )

            const orderAndUser = result.resultSets[0].rows[0];
            const userID = orderAndUser.items[4].bytesValue;

            // If userID in context == userID of order
            if (Buffer.from(userID).equals(context.userID)) {
                let orderPrice = orderAndUser.items[3].uint64Value;
                if (typeof orderPrice !== "number") {
                    orderPrice = orderPrice.toNumber()
                }

                return {
                    phone: orderAndUser.items[5].textValue,
                    price: orderPrice,
                    products: result.resultSets[1].rows.map(value => {
                        let productPrice = value.items[0].uint64Value
                        if (typeof productPrice !== "number") {
                            productPrice = productPrice?.toNumber()
                        }

                        return {
                            price: productPrice,
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