import {TableClient} from "ydb-sdk/build/table";
import Queries from "./queries";
import {JSONRPCError} from "./exceptions";

interface Product {
    id: String,
    count: number
}

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

    public addOrder(products: Array<Product>) {
        if(products.length === 0) throw new CartIsEmpty()

        for (const product of products) {
            Buffer.from(product.id, "hex")


        }
    }
}