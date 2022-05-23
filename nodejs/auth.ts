import {BaseContext} from "./types/context";
import * as crypto from "crypto";

import {sign} from "jsonwebtoken";
import {TableClient} from "ydb-sdk/build/table";

import Queries from "./queries";
import {PreconditionFailed} from "ydb-sdk/build/errors";

import {JSONRPCError} from "./exceptions";

function loggable(methodName: string, context: BaseContext) {
    console.log(`${methodName} was called from ${context.sourceIp} ${context.userAgent}`)
}

class PhoneAlreadyInUse extends JSONRPCError {
    constructor() {
        super("Phone already in use", 1005);
    }

    name = "PhoneAlreadyInUse";
}

class WrongSMSCodeError extends JSONRPCError {
    constructor() {
        super("Wrong SMS code", 1001);
    }

    name = "WrongSMSCodeError";
}

class PhoneIsNotRegistered extends JSONRPCError {
    constructor() {
        super("Phone is not registered yet", 1006);
    }

    name = "PhoneIsNotRegistered"
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
                    this.queries.addUserParams(params.phone, uid, sms_code,
                        Date.now() + this.SMS_CODE_EXPIRATION_TIME)
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
                await this.sendCode({phone: params.phone}, context)
                throw new PhoneAlreadyInUse();
            }
        }
    }

    // context var is required to call function by JSON RPC
    // noinspection JSUnusedLocalSymbols
    async sendCode(params: { phone: string }, context: BaseContext) {
        loggable("sendCode", context)

        const code = crypto.randomInt(this.SMS_CODE_RANDMIN, this.SMS_CODE_RANDMAX)

        await this.client.withSession(async (session) => {
            await session.executeQuery(
                await this.queries.updateCode(session),
                this.queries.createUpdateCodeParams(
                    params.phone, code,
                    Date.now() + this.SMS_CODE_EXPIRATION_TIME)
            )
        })

        /*self.sms.send_sms(phone,
            f'Your SMS code is: {code}',
            context['sourceIp'])*/
    }

    async checkCode(params: { phone: string, code: number }, context: BaseContext) {
        loggable("checkCode", context)

        if ((this.SMS_CODE_RANDMIN <= params.code) && (params.code <= this.SMS_CODE_RANDMAX)) {
            return await this.client.withSession(async (session) => {
                const queryResult = await session.executeQuery(await this.queries.selectUser(session),
                    this.queries.createSelectUserParams(params.phone))
                const result = queryResult.resultSets[0].rows

                if(result.length === 0) throw new PhoneIsNotRegistered();

                const uid = result[0].bytesValue;

                context.userID = uid

                return {
                    token: sign(
                        {
                            'id': uid,
                            'phone': params.phone
                        }, this.SECRET_KEY)
                }
            })
        } else throw new WrongSMSCodeError()
    }
}
