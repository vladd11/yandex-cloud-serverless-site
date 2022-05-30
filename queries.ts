import {Session} from "ydb-sdk/build/cjs/table";
import {Types, Ydb} from "ydb-sdk";
import {OrderItem} from "./types/product";

export default class Queries {
    private _addUser: Ydb.Table.PrepareQueryResult | undefined;
    private _updateCode: Ydb.Table.PrepareQueryResult | undefined;
    private _selectSMSCode: Ydb.Table.PrepareQueryResult | undefined;
    private _insertOrder: Ydb.Table.PrepareQueryResult | undefined;
    private _getOrder: Ydb.Table.PrepareQueryResult | undefined;

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

        //language=SQL
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

        //language=SQL
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

        //language=SQL
        this._selectSMSCode = await session.prepareQuery(`
        DECLARE $phone AS Utf8;
        
        SELECT id, sms_code, sms_code_expiration, verified
        FROM users
        WHERE phone=$phone;
        `)
        return this._selectSMSCode;
    }

    public async insertOrder(session: Session) {
        if (this._insertOrder) {
            return this._insertOrder
        }

        // language=SQL
        this._insertOrder = await session.prepareQuery(`
        DECLARE $items AS List<Struct<id: String, order_id: String, product_id: String, quantity: Uint32>>;
        DECLARE $order_id AS String;
        DECLARE $user_id AS String;
        
        UPSERT INTO order_items(id, order_id, product_id, quantity) 
        SELECT id, order_id, product_id, quantity FROM AS_TABLE($items);
        
        $table = (
            SELECT $order_id, false, false, $user_id, SUM(order_item.quantity * product.price)
            FROM AS_TABLE($items) AS order_item
            INNER JOIN products AS product
            ON (order_item.product_id==product.id)
        );
        
        UPSERT INTO orders(id, hasPaid, isCompleted, user_id, price)
        SELECT column0, column1, column2, column3, column4 FROM $table;
        
        SELECT column4 FROM $table;
        `)
        return this._insertOrder
    }

    public createInsertOrderParams(items: Array<OrderItem>, userID: Buffer, orderID: Buffer) {
        const itemParams = this.createItemsParams(items, orderID)

        return {
            "$items": itemParams,
            "$order_id": {
                type: Types.STRING,
                value: {
                    bytesValue: orderID
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

    private createItemsParams(items: Array<OrderItem>, orderID: Buffer) {
        return {
            value: {
                items: items.map(product => {
                    return {
                        items: [
                            {bytesValue: product.orderItemID},
                            {bytesValue: orderID},
                            {bytesValue: Buffer.from(product.id, "hex")},
                            {uint32Value: product.count}
                        ]
                    };
                })
            },
            type: Types.list(Types.struct(
                {
                    "id": Types.STRING,
                    "order_id": Types.STRING,
                    "product_id": Types.STRING,
                    "quantity": Types.UINT32
                },
            ))
        };
    }

    public async getOrder(session: Session) {
        if (!this._getOrder) {
            //language=SQL
            this._getOrder = await session.prepareQuery(`
            DECLARE $id AS String;
 
            SELECT orders.id, hasPaid, isCompleted, price, user_id, user.phone
            FROM orders
            
            INNER JOIN users VIEW idx_user_id AS user 
            ON (orders.user_id==user.id)
            
            WHERE orders.id=$id;
            
            SELECT 
            order_item.price, quantity,
            product.image_uri, product.title
            
            FROM order_items VIEW idx_order_id AS order_item
            
            INNER JOIN products AS product
            ON order_item.product_id==product.id
            
            WHERE order_id=$id;
            `)
        }
        return this._getOrder
    }

    public createGetOrderParams(orderID: Buffer) {
        return {
            "$id": {
                type: Types.STRING,
                value: {
                    bytesValue: orderID
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
