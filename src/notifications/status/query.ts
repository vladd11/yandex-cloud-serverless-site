import {Types} from "ydb-sdk";

export const getNotificationStatusQuery = `
    DECLARE $token AS Utf8;
    DECLARE $user_id AS String;
    
    SELECT COUNT(*)
    FROM notifications
    WHERE user_id=$user_id AND token == $token;
`;

export function createGetNotificationStatusQuery(userID: Buffer, token: string) {
    return {
        "$token": {
            type: Types.UTF8,
            value: {
                textValue: token
            }
        },
        "$user_id": {
            type: Types.STRING,
            value: {
                bytesValue: userID
            }
        }
    }
}
