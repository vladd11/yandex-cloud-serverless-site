import {BaseContext} from "./types/context";
import {Types} from "ydb-sdk";
import * as crypto from "crypto";

import {sign} from "jsonwebtoken";
import {TableClient} from "ydb-sdk/build/table";

import Queries from "./queries";
import {PreconditionFailed} from "ydb-sdk/build/errors";

import {JSONRPCError} from "./exceptions";

function loggable(methodName: string, context: BaseContext) {
    console.log(`${methodName} was called from ${context.sourceIp} ${context.userAgent}`)
}

class PhoneAlreadyInUse implements JSONRPCError {
    message = "Phone already in use";
    code = 1005;

    name = "PhoneAlreadyInUse";

    toObject() {
        return {
            code: this.code,
            message: this.message
        };
    }
}

export class Auth {
    public SMS_CODE_LENGTH: number = parseInt(process.env.SMS_CODE_LENGTH) || 6;
    public SMS_CODE_RANDMIN = 10 ** (this.SMS_CODE_LENGTH - 1);
    public SMS_CODE_RANDMAX = (10 ** this.SMS_CODE_LENGTH) - 1;

    public SMS_CODE_EXPIRATION_TIME = parseInt(process.env.SMS_CODE_EXPIRATION_TIME) || 600;

    private SECRET_KEY = process.env.SECRET_KEY;

    private queries: Queries;
    private client: TableClient;

    constructor(client: TableClient, queries: Queries) {
        this.client = client;
        this.queries = queries;
    }

    private createLoginParams(phone: string, uid: Buffer, sms_code: number) {
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
                    uint32Value: Date.now() + this.SMS_CODE_EXPIRATION_TIME
                }
            }
        }
    }

    /**
     * Login function
     * @param params
     * @param context JSON-RPC context
     */
    public async login(params: {
        phone: string,
        verify: boolean
    }, context: BaseContext): Promise<{ [key: string]: any }> {
        loggable("login", context);

        try {
            const uid = crypto.randomBytes(16)

            const sms_code = crypto.randomInt(this.SMS_CODE_RANDMIN, this.SMS_CODE_RANDMAX)

            await this.client.withSession(async (session) => {
                await session.executeQuery(
                    await this.queries.addUser(session),
                    this.createLoginParams(params.phone, uid, sms_code)
                )
            })

            context.user_uid = uid

            return {
                token: sign({
                    id: uid.toString('hex'),
                    phone: params.phone
                }, this.SECRET_KEY)
            }
        } catch (e) {
            if (e instanceof PreconditionFailed) {
                await this.send_code({phone: params.phone}, context)
                throw new PhoneAlreadyInUse();
            }
        }
    }

    createUpdateCodeParams(phone: string, sms_code: number) {
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
                type: Types.DATETIME, // Datetime is 32-bit unsigned integer
                value: {
                    uint32Value: Date.now() + this.SMS_CODE_EXPIRATION_TIME
                }
            }
        }
    }

    // context var is required to call function by JSON RPC
    // noinspection JSUnusedLocalSymbols
    async send_code(params: { phone: string }, context: BaseContext) {
        const code = crypto.randomInt(this.SMS_CODE_RANDMIN, this.SMS_CODE_RANDMAX)

        await this.client.withSession(async (session) => {
            await session.executeQuery(
                await this.queries.updateCode(session),
                this.createUpdateCodeParams(params.phone, code)
            )
        })

        /*self.sms.send_sms(phone,
            f'Your SMS code is: {code}',
            context['sourceIp'])*/
    }
}
