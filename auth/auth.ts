import {BaseContext} from "../types/context";
import * as crypto from "crypto";

import {sign, verify} from "jsonwebtoken";

import {AuthQueries} from "./queries";
import {JSONRPCError, requiredArgument} from "../exceptions";
import sendSMS from "../sms";
import {loggable} from "../rpc";
import {TableClient} from "ydb-sdk/build/cjs/table";
import staleReadOnly from "../staleReadOnly";

export class PhoneAlreadyInUse extends JSONRPCError {
    constructor() {
        super("Phone already in use", 1005);
    }

    name = "PhoneAlreadyInUse";
}

export class WrongJWTTokenException extends JSONRPCError {
    constructor() {
        super("JWT token can't be decrypted", 1002);
    }

    name = "WrongJWTTokenException"
}

export class WrongSMSCodeError extends JSONRPCError {
    constructor() {
        super("Wrong SMS code", 1001);
    }

    name = "WrongSMSCodeError";
}

export class PhoneIsNotRegistered extends JSONRPCError {
    constructor() {
        super("Phone is not registered yet", 1006);
    }

    name = "PhoneIsNotRegistered"
}

class AuthIsRequired extends JSONRPCError {
    constructor() {
        super("You should auth to call this function", 1003);
    }

    name = "AuthIsRequired"
}

export type AuthorizedContext = BaseContext & {
    userID?: Buffer
}

export function authRequired(methodName: string, context: AuthorizedContext) {
    if (!context.userID) {
        console.log(`Auth is required to call ${methodName} function`)
        throw new AuthIsRequired();
    }
}

declare module "jsonwebtoken" {
    // It's used below
    // noinspection JSUnusedGlobalSymbols
    export interface JwtPayload {
        id: string;
        phone: string;
    }
}

const secretKeyNotDefined = () => {
    throw new Error("SECRET_KEY environment variable not found")
};

export class Auth {
    public SMS_CODE_LENGTH: number = parseInt(process.env.SMS_CODE_LENGTH ?? "6");
    public SMS_CODE_RANDMIN = 10 ** (this.SMS_CODE_LENGTH - 1);
    public SMS_CODE_RANDMAX = (10 ** this.SMS_CODE_LENGTH) - 1;

    public SMS_CODE_EXPIRATION_TIME = parseInt(process.env.SMS_CODE_EXPIRATION_TIME ?? "600");

    private SECRET_KEY = process.env.SECRET_KEY ?? secretKeyNotDefined()

    private client: TableClient;

    constructor(client: TableClient) {
        this.client = client;
    }

    /**
     * Login function
     * @param params
     * @param context JSON-RPC context
     */
    public async login(params: {
        phone?: string,
        verify?: boolean
    }, context: AuthorizedContext): Promise<{ token: string }> {
        loggable("login", context);
        requiredArgument("phone", params.phone)
        requiredArgument("verify", params.verify)

        const uid: Buffer = crypto.randomBytes(16)
        const sms_code: number = crypto.randomInt(this.SMS_CODE_RANDMIN, this.SMS_CODE_RANDMAX)

        await this.client.withSessionRetry(async (session) => {
            const queryResult = await session.executeQuery(
                await session.prepareQuery(AuthQueries.addUser),
                AuthQueries.addUserParams(params.phone!, uid, sms_code,
                    Math.round(Date.now() / 1000) + this.SMS_CODE_EXPIRATION_TIME)
            )

            if (queryResult.resultSets[0].rows![0].items![0].boolValue) { // If phone was already registered; how it works - see query
                sendSMS(params.phone!, `Your SMS code is: ${sms_code}`, context.sourceIp)

                throw new PhoneAlreadyInUse();
            }
        })

        context.userID = uid

        return {
            token: sign({
                id: uid.toString('hex'),
                phone: params.phone
            }, this.SECRET_KEY)
        }
    }

    // context var is required to call function by JSON RPC
    // noinspection JSUnusedLocalSymbols
    async sendCode(params: { phone?: string }, context: BaseContext) {
        loggable("sendCode", context)
        requiredArgument("phone", params.phone)

        const code = crypto.randomInt(this.SMS_CODE_RANDMIN, this.SMS_CODE_RANDMAX)

        await this.client.withSessionRetry(async (session) => {
            await session.executeQuery(
                await session.prepareQuery(AuthQueries.updateCode),
                AuthQueries.createUpdateCodeParams(
                    params.phone!, code,
                    Math.round(Date.now() / 1000) + this.SMS_CODE_EXPIRATION_TIME)
            )
        })

        return {}

        /*self.sms.send_sms(phone,
            f'Your SMS code is: {code}',
            context['sourceIp'])*/
    }

    async checkCode(params: { phone?: string, code?: number }, context: AuthorizedContext) {
        loggable("checkCode", context);
        requiredArgument("phone", params.phone)
        requiredArgument("code", params.code)

        if ((this.SMS_CODE_RANDMIN <= params.code!) && (params.code! <= this.SMS_CODE_RANDMAX)) {
            return await this.client.withSessionRetry(async (session) => {
                const queryResult = await session.executeQuery(
                    await session.prepareQuery(AuthQueries.selectUser),
                    AuthQueries.createSelectUserParams(params.phone!),
                    staleReadOnly
                )
                const result = queryResult.resultSets[0].rows!

                if (result.length === 0) throw new PhoneIsNotRegistered();
                if(result[0].items![1].uint32Value !== params.code) throw new WrongSMSCodeError();
                if(result[0].items![2].uint32Value! < (Date.now() / 1000 | 0)) throw new WrongSMSCodeError();

                const uid: Buffer = Buffer.from(result[0].items![0].bytesValue!);

                context.userID = uid

                return {
                    token: sign(
                        {
                            id: uid.toString("hex"),
                            phone: params.phone
                        }, this.SECRET_KEY)
                }
            })
        } else throw new WrongSMSCodeError()
    }

    async verify(params: { token?: string }, context: AuthorizedContext) {
        loggable("verify", context)
        requiredArgument("token", params.token)

        let payload;
        try {
            payload = verify(params.token!, this.SECRET_KEY)
        } catch (e) {
            throw new WrongJWTTokenException();
        }

        if (typeof payload === "string") throw new WrongJWTTokenException();

        context.userID = Buffer.from(payload.id, "hex")

        return {
            id: payload.id,
            phone: payload.phone
        }
    }
}
