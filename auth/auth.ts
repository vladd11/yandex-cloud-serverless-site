import {TableClient} from "ydb-sdk/build/cjs/table";
import {AuthQueries} from "./queries";

import crypto from "crypto";
import {ApiResponse} from "../types/response";

namespace Auth {
    const SMS_CODE_LENGTH: number = parseInt(process.env.SMS_CODE_LENGTH ?? "6");
    const SMS_CODE_RANDMIN = 10 ** (SMS_CODE_LENGTH - 1);
    const SMS_CODE_RANDMAX = (10 ** SMS_CODE_LENGTH) - 1;

    const SMS_CODE_EXPIRATION_TIME = parseInt(process.env.SMS_CODE_EXPIRATION_TIME ?? "600");

    /**
     * Send SMS code & update it on DB
     * @param client YDB client
     * @param body It's plain text with only phone
     */
    export async function sendCode(client: TableClient, body: string) : Promise<ApiResponse> {
        const code = crypto.randomInt(SMS_CODE_RANDMIN, SMS_CODE_RANDMAX)

        await client.withSessionRetry(async (session) => {
            await session.executeQuery(
                await session.prepareQuery(AuthQueries.updateCode),
                AuthQueries.createUpdateCodeParams(
                    body, code,
                    Math.round(Date.now() / 1000) + SMS_CODE_EXPIRATION_TIME)
            )
        })

        return {
            statusCode: 200
        }
    }
}

export default Auth;
