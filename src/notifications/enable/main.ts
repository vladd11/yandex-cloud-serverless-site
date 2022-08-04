import {TableClient} from "ydb-sdk/build/cjs/table";

import {ApiResponse, Headers} from "../../types/api";
import {addTokenToTable, createAddTokenToTableParams} from "./query";
import verifyAuthHeader from "../../auth/parseAuthHeader";

export default async function enableNotifications(client: TableClient, body: string, headers: Headers): Promise<ApiResponse> {
    const params: {
        token: string
    } = JSON.parse(body);

    const user = verifyAuthHeader(headers.Authorization)
    if(!user) return {statusCode: 401}

    await client.withSessionRetry(async (session) => {
        return session.executeQuery(addTokenToTable, createAddTokenToTableParams(user.id, params.token))
    })

    return {
        statusCode: 200
    }
}