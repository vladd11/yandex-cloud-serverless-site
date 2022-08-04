import {Types} from "ydb-sdk";

//language=SQL
export const addTokenToTable = `
DECLARE $user_id AS String;
DECLARE $token AS Utf8;

UPSERT INTO notifications(token, user_id)
VALUES ($token, $user_id);
`

export function createAddTokenToTableParams(userID: Buffer, token: string) {
    return {
        "$user_id": {
            type: Types.STRING,
            value: {
                bytesValue: userID
            }
        },
        "$token": {
            type: Types.UTF8,
            value: {
                textValue: token
            }
        }
    }
}