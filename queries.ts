import {Session} from "ydb-sdk/build/table";
import {Types, Ydb} from "ydb-sdk";

export default class Queries {
    private _addUser: Ydb.Table.PrepareQueryResult | undefined;
    private _insertOrder: Ydb.Table.PrepareQueryResult | undefined;
    private _updateCode: Ydb.Table.PrepareQueryResult | undefined;
    private _selectSMSCode: Ydb.Table.PrepareQueryResult | undefined;

    public addUserParams(phone: string, uid: Buffer, smsCode: number, smsCodeExpiration: number) {
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

    public async addUser(session: Session): Promise<Ydb.Table.PrepareQueryResult> {
        if (this._addUser) return this._addUser

        this._addUser = await session.prepareQuery(`
        DECLARE $id as String;
        DECLARE $phone as Utf8;
        DECLARE $sms_code as Uint32;
        DECLARE $sms_code_expiration as Datetime;
        
        $old_id = SELECT id FROM users WHERE phone=$phone;
        
        UPSERT INTO users(phone, id, sms_code, sms_code_expiration)
        VALUES($phone,
        if($old_id IS NULL, $id, $old_id),
        $sms_code, $sms_code_expiration);
        
        SELECT $old_id IS NOT NULL;`)
        return this._addUser
    }

    public createUpdateCodeParams(phone: string, smsCode: number, smsCodeExpiration: number) {
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

    public async updateCode(session: Session): Promise<Ydb.Table.PrepareQueryResult> {
        if (this._updateCode) return this._updateCode

        this._updateCode = await session.prepareQuery(`
        DECLARE $phone AS Utf8;
        DECLARE $sms_code AS Uint32;
        DECLARE $sms_code_expiration AS Datetime;

        UPDATE users 
        SET sms_code=$sms_code, sms_code_expiration=$sms_code_expiration
        WHERE phone=$phone;`)
        return this._updateCode;
    }

    public createSelectUserParams(phone: string) {
        return {
            '$phone': {
                type: Types.UTF8,
                value: {
                    textValue: phone
                }
            }
        }
    }

    public async selectUser(session: Session): Promise<Ydb.Table.PrepareQueryResult> {
        if (this._selectSMSCode) return this._selectSMSCode;

        this._selectSMSCode = await session.prepareQuery(`
        DECLARE $phone AS Utf8;
        
        SELECT id, sms_code, sms_code_expiration, verified
        FROM users
        WHERE phone=$phone;
        `)
        return this._selectSMSCode;
    }

    public async insertOrder(session: Session): Promise<Ydb.Table.PrepareQueryResult> {
        if (this._insertOrder) return this._insertOrder;

        // language=SQL
        this._insertOrder = await session.prepareQuery(`
        DECLARE $order_id AS String;
        DECLARE $user_id AS String;
        DECLARE $order_ids AS List<String>;
        
        UPSERT INTO orders(id, hasPaid, isCompleted, user_id, price)
        
        SELECT $order_id, false, false, $user_id, SUM(order_item.quantity * product.price)
        FROM order_items AS order_item
        
        INNER JOIN products AS product ON (order_item.product_id==product.id)
        WHERE order_item.id in $order_ids;`)
        return this._insertOrder;
    }

    public async insertOrderItems() {
        // language=SQL
        return `
        DECLARE $order_id AS String;
        DECLARE $user_id AS String;
        DECLARE $order_ids AS List<String>;
        
        DECLARE $items AS List<Struct<id: String, order_id: String, product_id: String, quantity: Uint32>>;

        INSERT INTO order_items(id, order_id, product_id, quantity) 
        SELECT id, order_id, product_id, quantity FROM $items;
        
        UPSERT INTO orders(id, hasPaid, isCompleted, user_id, price)
        
        SELECT $order_id, false, false, $user_id, SUM(order_item.quantity * product.price)
        FROM order_items AS order_item
        
        INNER JOIN products AS product ON (order_item.product_id==product.id)
        WHERE order_item.id IN $order_ids;
        `
    }

    public createInsertOrderParams(id: Buffer) {
        return {
            "$id": {
                type: Types.STRING,
                value: {
                    bytesValue: id
                }
            }
        }
    }

    /**
     * Returns txControl object for Stale Read Only mode.
     * Docs:
     * Data reads in a transaction return results with a possible delay (fractions of a second).
     * Each individual read returns consistent data, but no consistency between different reads is guaranteed.
     */
    public staleReadOnly() {
        return {
            beginTx: {
                staleReadOnly: {}
            },
            commitTx: true
        }
    }
}
