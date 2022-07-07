import {Types} from "ydb-sdk";

//language=SQL
export const removeTokensFromTable = `
DECLARE $user_id AS String;

DELETE FROM notifications
WHERE user_id=$user_id;
`

export function createRemoveTokensFromTableParams(userID: Buffer) {
    return {
        "$user_id": {
            type: Types.STRING,
            value: {
                bytesValue: userID
            }
        }
    }
}