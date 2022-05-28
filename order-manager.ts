import {TableClient} from "ydb-sdk/build/table";
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

        params.products.forEach(value => value.orderItemID = crypto.randomBytes(16))

        await this.client.withSessionRetry(async (session) => {
            await session.executeQuery(
                await this.queries.insertOrderItems(session),
                this.queries.createInsertOrderItemsParams(params.products, id)
            )
        })

        await this.client.withSessionRetry(async (session) => {
            await session.executeQuery(
                await this.queries.insertOrder(session),
                this.queries.createInsertOrderParams(params.products, Buffer.from(context.userID), id)
            )
        })

        return {
            id: id.toString("hex"),
            redirect: (params.paymentMethod === "cash") ? null : "https://google.com"
        }
    }
}