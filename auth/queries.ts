import {Types} from "ydb-sdk";
import {getCurrentDatetime} from "../utils/datetime";

export namespace AuthQueries {
    export function addUserParams(phone: string, uid: Buffer, smsCode: number, smsCodeExpiration: number) {
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
                    uint32Value: smsCode
                }
            },
            '$sms_code_expiration': {
                type: Types.DATETIME, // Timestamp is 32-bit unsigned integer
                value: {
                    uint32Value: smsCodeExpiration
                }
            }
        }
    }

    //language=SQL
    export const addUser = `
    DECLARE $id as String;
    DECLARE $phone as Utf8;
    DECLARE $sms_code as Uint32;
    DECLARE $sms_code_expiration as Datetime;
    
    $old_id = SELECT id FROM users WHERE phone=$phone;
    
    UPSERT INTO users(phone, id, sms_code, sms_code_expiration)
    VALUES($phone,
    if($old_id IS NULL, $id, $old_id),
    $sms_code, $sms_code_expiration);
    
    /*SELECT $old_id IS NOT NULL;*/`;

    export function createUpdateCodeParams(phone: string, smsCode: number, smsCodeExpiration: number) {
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
                    uint32Value: smsCode
                }
            },
            '$sms_code_expiration': {
                type: Types.DATETIME, // Datetime is 32-bit unsigned integer
                value: {
                    uint32Value: smsCodeExpiration
                }
            }
        }
    }

    export const updateCode = `
    DECLARE $phone AS Utf8;
    DECLARE $sms_code AS Uint32;
    DECLARE $sms_code_expiration AS Datetime;

    $table = (
        SELECT phone
        FROM users
        WHERE phone=$phone
    );
    
    UPSERT INTO users(phone, sms_code, sms_code_expiration)
    SELECT phone, $sms_code, $sms_code_expiration
    FROM $table;
    
    SELECT COUNT(phone) FROM $table;`;

    export function createSelectUserParams(phone: string, sms_code: number, sms_code_expiration: number) {
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
                type: Types.DATETIME,
                value: {
                    uint32Value: sms_code_expiration
                }
            },
            '$currentDatetime': {
                type: Types.DATETIME,
                value: {
                    uint32Value: getCurrentDatetime()
                }
            }
        }
    }

    //language=SQL
    export const selectUser = `
    DECLARE $phone AS Utf8;
    
    DECLARE $sms_code AS Uint32;
    DECLARE $sms_code_expiration AS Datetime;
    
    DECLARE $currentDatetime AS Datetime;
    
    $table = (
        SELECT id, sms_code, sms_code_expiration, ($sms_code == sms_code) as same, ($currentDatetime > sms_code_expiration) as expired
        FROM users
        WHERE phone=$phone
    );
    
    UPSERT INTO users(phone, sms_code, sms_code_expiration)
    SELECT $phone, $sms_code, $sms_code_expiration
    FROM $table
    WHERE NOT same AND expired;
    
    SELECT id, sms_code, sms_code_expiration, same, expired
    FROM $table;`
}
