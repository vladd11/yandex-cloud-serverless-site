import {TableClient} from "ydb-sdk/build/cjs/table";
import {JSONRPCError, requiredArgument} from "../exceptions";
import {loggable} from "../rpc";
import {AuthorizedContext, authRequired} from "../auth/legacyAuth";
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

class InvalidPaymentMethod extends JSONRPCError {
    constructor(method: string) {
        super(`Payment method "${method}" not found`, 2001);
    }
}

export type PaymentMethod = { [key: string]: number };
const paymentMethods: PaymentMethod = {
    cash: 1,
    card: 2
}

function getPaymentMethodByNumberID(id: number): string | undefined {
    return Object.keys(paymentMethods).find(key => paymentMethods[key] === id);
}

export default class OrderManager {
    private client: TableClient;

    constructor(client: TableClient) {
        this.client = client;
    }

    public async addOrder(params: {
        products?: Array<OrderItem>,
        paymentMethod?: string,
        phone?: string,
        address?: string,
        time?: number
    }, context: AuthorizedContext) {
        loggable("addOrder", context)
        authRequired("addOrder", context)

        requiredArgument("paymentMethod", params.paymentMethod)
        requiredArgument("products", params.products)
        requiredArgument("time", params.time)
        requiredArgument("phone", params.phone)

        if (params.products!.length === 0) throw new CartIsEmpty()

        const paymentMethod: number = paymentMethods[params.paymentMethod!]
        if (!paymentMethod) {
            throw new InvalidPaymentMethod(params.paymentMethod!);
        }

        const id = crypto.randomBytes(16)

        params.products!.forEach(value => {
            value.orderItemID = crypto.randomBytes(16)
        })

        const result = await this.client.withSessionRetry(async (session) => {
            return await session.executeQuery(
                await session.prepareQuery(OrderQueries.insertOrder),
                OrderQueries.createInsertOrderParams(params.products!, context.userID!, id, params.phone!, paymentMethod, params.time!)
            )
        })

        return {
            id: id.toString("hex"),
            phone: params.phone,
            time: params.time,
            price: priceToNumber(result.resultSets[0].rows![0].items![2].uint64Value!),
            paymentMethod: params.paymentMethod,
            redirect: (params.paymentMethod === "cash") ? null : "https://google.com",

            products: result.resultSets[0].rows!.map((value) => {
                const title = value.items![0].textValue
                const imageURI = value.items![1].textValue
                const price = value.items![2].uint64Value
                const quantity = value.items![3].uint32Value

                return {
                    Price: priceToNumber(price!),
                    quantity: quantity,
                    ImageURI: imageURI,
                    Title: title
                }
            })
        }
    }

    public async getOrder(params: { orderID?: string }, context: AuthorizedContext): Promise<{
        phone: string;
        paymentMethod: string,
        time: number,
        price: number;
        products: {
            ImageURI: string;
            quantity: number;
            Price: number;
            Title: string
        }[]
    } | null> {
        loggable("getOrder", context)
        authRequired("getOrder", context)
        requiredArgument("orderID", params.orderID)

        return await this.client.withSessionRetry(async (session) => {
            const result = await session.executeQuery(
                await session.prepareQuery(OrderQueries.getOrder),
                OrderQueries.createGetOrderParams(Buffer.from(params.orderID!, "hex")),
                staleReadOnly
            )

            const order = result.resultSets[0].rows![0];
            const userID = order.items![4].bytesValue!;

            // If userID in context == userID of order
            if (Buffer.from(userID).equals(context.userID!)) {
                return {
                    paymentMethod: getPaymentMethodByNumberID(order.items![7].uint32Value!) ?? "none",
                    phone: order.items![5].textValue!,
                    price: priceToNumber(order.items![3].uint64Value!),
                    time: order.items![6].uint32Value!,
                    products: result.resultSets[1].rows!.map(value => {
                        return {
                            Price: priceToNumber(value.items![0].uint64Value!),
                            quantity: value.items![1].uint32Value!,
                            ImageURI: value.items![2].textValue!,
                            Title: value.items![3].textValue!
                        }
                    })
                };
            }
            return null;
        })
    }
}