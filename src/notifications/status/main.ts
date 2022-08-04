import {TableClient} from "ydb-sdk/build/cjs/table";

import {ApiResponse, Headers} from "../../types/api"
import parseAuthHeader from "../../auth/parseAuthHeader";
import {createGetNotificationStatusQuery, getNotificationStatusQuery} from "./query";

export default async function getNotificationStatus(client: TableClient, token: string, headers: Headers): Promise<ApiResponse> {
    const user = parseAuthHeader(headers.Authorization)
    if (!user) return {statusCode: 401}

    const result = await client.withSessionRetry(async (session) => {
        return await session.executeQuery(getNotificationStatusQuery, createGetNotificationStatusQuery(user.id, token))
    })

    const value = result.resultSets[0].rows![0].items![0].uint64Value!
    return {
        statusCode: 200,
        body: JSON.stringify({
            enabled: !(value === 0 || (typeof value === "number") ? false : !value.compare(0))
            // True of enabled on current device
        })
    }
}