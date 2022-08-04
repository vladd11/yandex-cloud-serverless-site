import {TableClient} from "ydb-sdk/build/cjs/table";

import {ApiResponse, Headers} from "../../types/api";
import {removeTokensFromTable, createRemoveTokensFromTableParams} from "./query";
import verifyAuthHeader from "../../auth/parseAuthHeader";

export default async function disableNotifications(client: TableClient, headers: Headers): Promise<ApiResponse> {
    const user = verifyAuthHeader(headers.Authorization)
    if (!user) return {statusCode: 401}

    await client.withSessionRetry(async (session) => {
        return session.executeQuery(removeTokensFromTable, createRemoveTokensFromTableParams(user.id))
    })

    return {statusCode: 200}
}