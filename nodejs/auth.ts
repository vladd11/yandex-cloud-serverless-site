import {BaseContext} from "./context";
import {Types} from "ydb-sdk";
import * as crypto from "crypto";

import {sign} from "jsonwebtoken";
import {TableClient} from "ydb-sdk/build/table";

import Queries from "./queries";

function loggable(methodName: string, context: BaseContext) {
    console.log(`${methodName} was called from ${context.sourceIp} ${context.userAgent}`)
}

/**
 * Why this isn't class? Because classes can't contain interfaces inside.
 * It will impact on code readability
 */
export namespace Auth {
    const SMS_CODE_LENGTH: number = parseInt(process.env.SMS_CODE_LENGTH) || 6;
    const SMS_CODE_RANDMIN = 10 ** (SMS_CODE_LENGTH - 1);
    const SMS_CODE_RANDMAX = (10 ** SMS_CODE_LENGTH) - 1;

    const SMS_CODE_EXPIRATION_TIME = parseInt(process.env.SMS_CODE_EXPIRATION_TIME) || 600;

    const SECRET_KEY = process.env.SECRET_KEY;

    export type AuthorizedContext = BaseContext & {
        user_uid: Buffer
    }

    export interface LoginOutput {
        /**
         * JWT token with following payload
         */
        token: string
    }

    function createLoginParams(phone: string, uid: Buffer, sms_code: number) {
        return {
            '$phone': {
                type: Types.UTF8,
                value: {
                    textValue: phone
                }
            },
            '$id': {
                type: Types.STRING,
                value: {
                    bytesValue: uid
                }
            },
            '$sms_code': {
                type: Types.UINT32,
                value: {
                    uint32Value: sms_code
                }
            },
            '$sms_code_expiration': {
                type: Types.DATETIME, // Timestamp is 32-bit unsigned integer
                value: {
                    uint32Value: Date.now() + SMS_CODE_EXPIRATION_TIME
                }
            }
        }
    }

    /**
     * Login function
     * @param client YDB table client (driver.tableClient)
     * @param queries Queries class (queries.ts) that prepare queries on-demand
     * @param phone User phone
     * @param verify Should phone be verified or user paying by card
     * @param context JSON-RPC context
     */
    export async function login(client: TableClient, queries: Queries, phone: string, verify: boolean, context: BaseContext): Promise<LoginOutput> {
        loggable("login", context);

        const uid = crypto.randomBytes(16)

        const sms_code = crypto.randomInt(SMS_CODE_RANDMIN, SMS_CODE_RANDMAX)

        await client.withSession(async (session) => {
            await session.executeQuery(await queries.addUser(session), createLoginParams(phone, uid, sms_code))
        })

        context.user_uid = uid

        send_code(client, queries, phone, context)

        return {
            token: sign({id: uid.toString('hex'), 'phone': phone}, SECRET_KEY)
        }
    }

    function createUpdateCodeParams(phone: string, sms_code: number) {
        return {
            '$phone': {
                type: Types.UTF8,
                value: {
                    textValue: phone
                }
            },
            '$sms_code': {
                type: Types.UINT32,
                value: {
                    uint32Value: sms_code
                }
            },
            '$sms_code_expiration': {
                type: Types.TIMESTAMP, // Timestamp is 32-bit unsigned integer
                value: {
                    uint32Value: Date.now() + SMS_CODE_EXPIRATION_TIME
                }
            }
        }
    }

    export async function send_code(client: TableClient, queries: Queries, phone: string, context: BaseContext) {
        const code = crypto.randomInt(SMS_CODE_RANDMIN, SMS_CODE_RANDMAX)

        await client.withSession(async (session) => {
            await session.executeQuery(await queries.updateCode(session), createUpdateCodeParams(phone, code))
        })

        /*self.sms.send_sms(phone,
            f'Your SMS code is: {code}',
            context['sourceIp'])*/
    }
}
