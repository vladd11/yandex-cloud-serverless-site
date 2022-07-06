import {TableClient} from "ydb-sdk/build/cjs/table";

import {AuthQueries} from "./queries";
import crypto from "crypto";
import {ApiResponse, Headers, Identity} from "../types/api";

import {sign, verify} from "jsonwebtoken";
import {sendLoginSMS} from "../sms";
import {getCurrentDatetime, getExpirationDatetime} from "../utils/datetime";

const secretKeyNotDefined = () => {
    throw new Error("SECRET_KEY environment variable not found")
};

export function phoneNotFound(): ApiResponse {
    return {statusCode: 401, body: JSON.stringify({code: 1001, message: "Phone is not registered yet"})}
}

export function invalidCode(): ApiResponse {
    return {statusCode: 401, body: JSON.stringify({code: 1002, message: "Wrong SMS code"})}
}

export function expiredCode(): ApiResponse {
    return {statusCode: 401, body: JSON.stringify({code: 1003, message: "Expired SMS code"})}
}

namespace Auth {
    const SMS_CODE_LENGTH: number = parseInt(process.env.SMS_CODE_LENGTH ?? "6");
    export const SMS_CODE_RANDMIN = 10 ** (SMS_CODE_LENGTH - 1);
    export const SMS_CODE_RANDMAX = (10 ** SMS_CODE_LENGTH) - 1;

    export const SECRET_KEY = process.env.SECRET_KEY ?? secretKeyNotDefined()

    // This is Russian phone length.
    // TODO: Need to add support for another country numbers
    const PHONE_LENGTH = 12;

    /**
     * Send SMS code & update it on DB.
     *
     * This function should be called if user want to log in, not order,
     * because it will throw 401 code if phone not exists on DB
     *
     * @param client
     * @param body JSON string
     * @param headers
     * @param identity
     */
    export async function sendCodeToLogin(client: TableClient, body: string, headers: Headers, identity: Identity): Promise<ApiResponse> {
        const params: {
            phone?: string
        } = JSON.parse(body)

        if (params.phone?.length !== PHONE_LENGTH) return {statusCode: 400}

        const result = await _resendCode(client, params.phone, identity.sourceIp)
        return {
            statusCode: (result)
                ? 401
                : 200
        }
    }

    /**
     * Fetches the database to find phone, then update SMS code and sends it
     * @return true if phone wasn't found, else false
     */
    export async function _resendCode(client: TableClient, phone: string, ip: string) {
        const code = crypto.randomInt(SMS_CODE_RANDMIN, SMS_CODE_RANDMAX)

        const result = await client.withSessionRetry(async (session) => {
            return await session.executeQuery(
                await session.prepareQuery(AuthQueries.updateCode),
                AuthQueries.createUpdateCodeParams(
                    phone, code,
                    getExpirationDatetime())
            )
        })

        sendLoginSMS(phone, code, ip)

        const value = result.resultSets[0].rows![0].items![0].uint64Value!
        return value === 0 || ((typeof value === "object") ? !value.compare(0) : false)
    }

    export async function _addUser(client: TableClient, phone: string, identity: Identity) {
        const uid = crypto.randomBytes(16)
        const code = crypto.randomInt(SMS_CODE_RANDMIN, SMS_CODE_RANDMAX)

        await client.withSessionRetry(async session => {
            return await session.executeQuery(await session.prepareQuery(AuthQueries.addUser),
                AuthQueries.addUserParams(phone!, uid, code, getExpirationDatetime()));
        })

        sendLoginSMS(phone, code, identity.sourceIp)
    }

    /**
     * This function should be called if user called /send-code, received code, and entered it
     *
     * Checks SMS code by phone
     * If it matches - returns token
     * Else returns 401 error
     */
    export async function login(client: TableClient, body: string, identity: Identity): Promise<ApiResponse> {
        const params: {
            phone?: string,
            code?: number
        } = JSON.parse(body)

        if (params.phone == null || params.phone.length !== PHONE_LENGTH) return {statusCode: 400};

        if ((SMS_CODE_RANDMIN <= params.code!) && (params.code! <= SMS_CODE_RANDMAX)) {
            return await client.withSessionRetry(async (session) => {
                const smsCode = crypto.randomInt(SMS_CODE_RANDMIN, SMS_CODE_RANDMAX)
                const smsCodeExpiration = getExpirationDatetime()

                const queryResult = await session.executeQuery(
                    await session.prepareQuery(AuthQueries.selectUser),
                    AuthQueries.createSelectUserParams(params.phone!, smsCode, smsCodeExpiration)
                )
                const result = queryResult.resultSets[0].rows!

                if (result.length === 0) return phoneNotFound()
                if (result[0].items![1].uint32Value !== params.code) return invalidCode()
                if (result[0].items![2].uint32Value! < getCurrentDatetime()) {
                    sendLoginSMS(params.phone!, smsCode, identity.sourceIp)
                    return expiredCode();
                }

                const uid: Buffer = Buffer.from(result[0].items![0].bytesValue!);

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        token: sign(
                            {
                                id: uid.toString("hex"),
                                phone: params.phone
                            }, SECRET_KEY)
                    })
                }
            })
        } else return {statusCode: 401}
    }

    export function _verify(token: string) {
        try {
            let payload: any = verify(token, SECRET_KEY)
            if (typeof payload === "string") payload = JSON.parse(payload)

            return {
                id: Buffer.from(payload.id, "hex"),
                phone: payload.phone
            }
        } catch (e) {
            console.error(e)
            return null;
        }
    }
}

export default Auth;
