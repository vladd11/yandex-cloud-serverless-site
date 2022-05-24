import {TableClient} from "ydb-sdk/build/table";
import Queries from "./queries";
import {JSONRPCError} from "./exceptions";
import {loggable} from "./rpc";
import {AuthorizedContext, authRequired} from "./auth";
import * as crypto from "crypto";

import Product from "./types/product";

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

    public async addOrder(params: { products: Array<Product> }, context: AuthorizedContext) {
        loggable("addOrder", context)
        authRequired("addOrder", context)

        if (params.products.length === 0) throw new CartIsEmpty()

        const id = crypto.randomBytes(16)

        await this.client.withSession(async (session) => {
            await session.executeQuery(
                await this.queries.insertOrderItems(),
                this.queries.createInsertOrderParams(id)
            )
        })
        for (const product of params.products) {
            Buffer.from(product.id, "hex")


        }
    }
}