import {TableClient, Session} from "ydb-sdk/build/cjs/table";

import {ApiResponse, Headers, Identity} from "../types/api";
import {OrderItem} from "../types/product";
import Auth, {expiredCode, invalidCode} from "../auth/auth";
import {OrderQueries} from "./queries";
import crypto from "crypto";
import paymentMethods, {getPaymentMethodByNumberID} from "../paymentMethods";
import priceToNumber from "../utils/priceToNumber";
import staleReadOnly from "../stale-readonly";
import {sendLoginSMS} from "../sms";
import {TimeRange} from "../gatsby-material-e-commerce/src/currentDateTime";
import {sign} from "jsonwebtoken";

export namespace OrderManager {
    import SMS_CODE_RANDMIN = Auth.SMS_CODE_RANDMIN;
    import SMS_CODE_RANDMAX = Auth.SMS_CODE_RANDMAX;
    import SECRET_KEY = Auth.SECRET_KEY;

    function argumentIsRequired(name: string): ApiResponse {
        return {
            statusCode: 400,
            body: `Missing argument ${name}`
        }
    }

    function cartIsEmpty(): ApiResponse {
        return {
            statusCode: 400,
            body: "Cart is empty"
        }
    }

    function invalidPaymentMethod(name: string): ApiResponse {
        return {
            statusCode: 400,
            body: `Invalid payment method ${name}`
        }
    }

    interface OrderParams {
        products?: Array<OrderItem>,
        paymentMethod?: string,
        phone?: string,
        address?: string,
        time?: TimeRange,
        code?: number // If client haven't auth token, they may send code and API will return JWT token & add order in one request
    }

    /**
     * Make order
     * There are 3 variant of actions:
     * - If Authorization Header provided:
     * - - Order will be inserted
     * - - Return HTTP 200
     * - Else:
     * - - If code provided:
     * - - - Runs query that:
     * - - - - Checks code from DB
     * - - - - If it's OK, query will add new order
     * - - - - Else return why it's invalid
     * - - Else:
     * - - - Sends SMS code & updates code in DB
     */
    export async function order(client: TableClient, body: string, headers: Headers, identity: Identity): Promise<ApiResponse> {
        const params: OrderParams = JSON.parse(body)

        if (!params.products) return argumentIsRequired("products")
        if (!params.paymentMethod) return argumentIsRequired("paymentMethod")
        if (!params.phone) return argumentIsRequired("phone")
        if (!params.address) return argumentIsRequired("address")
        if (!params.time) return argumentIsRequired("time")

        if (!params.time.startDate) return argumentIsRequired("time")
        if (!params.time.endDate) return argumentIsRequired("time")

        if (params.products!.length === 0) return cartIsEmpty();

        const paymentMethod: number = paymentMethods[params.paymentMethod]
        if (!paymentMethod) return invalidPaymentMethod(params.paymentMethod)

        const id = crypto.randomBytes(16)

        params.products!.forEach((value, index) => {
            if (!value.id || !value.count) return argumentIsRequired(`Product ${index} doesn't contain id or count`)

            value.orderItemID = crypto.randomBytes(16)
        })

        if (headers.Authorization?.startsWith("Bearer")) {
            const verify = Auth._verify(headers.Authorization.substring(7, headers.Authorization.length));
            if (!verify) return _orderNotAuthorized(client, params.phone, identity)

            const result = await client.withSessionRetry(async (session: Session) => {
                return await session.executeQuery(
                    await session.prepareQuery(OrderQueries.insertOrder),
                    OrderQueries.createInsertOrderParams(params.products!,
                        verify.id, id,
                        params.phone!,
                        paymentMethod,
                        params.time!
                    )
                )
            })

            return {
                statusCode: 200,
                body: JSON.stringify({
                    id: id.toString("hex"),
                    price: priceToNumber(result.resultSets[0].rows![0].items![2].uint64Value!),
                    redirect: (params.paymentMethod === "cash") ? null : "https://google.com",
                    products: result.resultSets[0].rows!.map((value) => {
                        return {
                            Title: value.items![0].textValue,
                            ImageURI: value.items![1].textValue,
                            Price: priceToNumber(value.items![2].uint64Value!),
                            quantity: value.items![3].uint32Value
                        }
                    })
                })
            }
        } else {
            if (params.code) {
                return _orderCodeAuthorized(client, params, paymentMethod, identity)
            } else return _orderNotAuthorized(client, params.phone, identity)
        }
    }

    /**
     * This function should be called if code isn't null, but JWT token is.
     */
    async function _orderCodeAuthorized(client: TableClient, params: OrderParams, paymentMethod: number, identity: Identity): Promise<ApiResponse> {
        const userID = crypto.randomBytes(16)
        const orderID = crypto.randomBytes(16)
        const optionalNewCode = crypto.randomInt(SMS_CODE_RANDMIN, SMS_CODE_RANDMAX)

        const result = await client.withSessionRetry(async (session) => {
            return await session.executeQuery(OrderQueries.insertOrderAndCheckCode,
                OrderQueries.createInsertOrderAndCheckCodeParams(params.products!,
                    userID,
                    orderID,
                    params.phone!,
                    paymentMethod,
                    params.time!,
                    params.code!,
                    optionalNewCode))
        })

        const valid = result.resultSets[1].rows![0];

        if (!valid.items![0].boolValue) return invalidCode();
        else if (!valid.items![1].boolValue) {
            sendLoginSMS(params.phone!, optionalNewCode, identity.sourceIp)
            return expiredCode();
        } else {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    token: sign(
                        {
                            id: Buffer.from(valid.items![2].bytesValue!).toString("hex"),
                            phone: params.phone
                        }, SECRET_KEY),
                    id: orderID.toString("hex"),
                    price: priceToNumber(result.resultSets[0].rows![0].items![2].uint64Value!),
                    redirect: (params.paymentMethod === "cash") ? null : "https://google.com",
                    products: result.resultSets[0].rows!.map((value) => {
                        return {
                            Title: value.items![0].textValue,
                            ImageURI: value.items![1].textValue,
                            Price: priceToNumber(value.items![2].uint64Value!),
                            quantity: value.items![3].uint32Value
                        }
                    })
                })
            }
        }
    }

    /**
     * This function should be called if code and JWT token are both null
     */
    async function _orderNotAuthorized(client: TableClient, phone: string, identity: Identity) {
        await Auth._addUser(client, phone, identity)
        return {
            statusCode: 401,
            body: JSON.stringify({
                code: 1,
                message: "Code sent"
            })
        }
    }

    export async function getOrder(client: TableClient, params: { orderID?: string }, headers: Headers): Promise<ApiResponse> {
        if (!params.orderID) return argumentIsRequired("orderID")

        const result = await client.withSessionRetry(async (session) => {
            return await session.executeQuery(
                await session.prepareQuery(OrderQueries.getOrder),
                OrderQueries.createGetOrderParams(Buffer.from(params.orderID!, "hex")),
                staleReadOnly
            )
        })

        const order = result.resultSets[0].rows![0];
        const userID = order.items![4].bytesValue!;

        if (headers.Authorization?.startsWith("Bearer")) {
            const verify = Auth._verify(headers.Authorization.substring(7, headers.Authorization.length));
            if (!verify) return {statusCode: 401};

            if (Buffer.from(userID).equals(verify.id)) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        paymentMethod: getPaymentMethodByNumberID(order.items![8].uint32Value!) ?? "none",
                        phone: order.items![5].textValue!,
                        price: priceToNumber(order.items![3].uint64Value!),
                        time: {
                            startDate: order.items![6].uint32Value!,
                            endDate: order.items![6].uint32Value!
                        },
                        products: result.resultSets[1].rows!.map(value => {
                            return {
                                Price: priceToNumber(value.items![0].uint64Value!),
                                quantity: value.items![1].uint32Value!,
                                ImageURI: value.items![2].textValue!,
                                Title: value.items![3].textValue!
                            }
                        })
                    })
                };
            } else return {statusCode: 403}
        } else return {statusCode: 401}
    }
}

export default OrderManager;
