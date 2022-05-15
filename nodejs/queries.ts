import {Session} from "ydb-sdk/build/table";
import {Ydb} from "ydb-sdk";

export default class Queries {
    private _addUser: Ydb.Table.PrepareQueryResult;
    private _insertOrder: Ydb.Table.PrepareQueryResult;
    private _updateCode: Ydb.Table.PrepareQueryResult;

    public async addUser(session: Session): Promise<Ydb.Table.PrepareQueryResult> {
        if (this._addUser) {
            return this._addUser
        }
        this._addUser = await session.prepareQuery(`
        DECLARE $id AS String;
        DECLARE $sms_code AS Uint32;
        DECLARE $sms_code_expiration AS Datetime;
        DECLARE $phone AS Utf8;
                
        INSERT INTO users(id, phone, sms_code, sms_code_expiration)
        VALUES ($id, $phone, $sms_code, $sms_code_expiration);`)
        return this._addUser
    }

    public async updateCode(session: Session): Promise<Ydb.Table.PrepareQueryResult> {
        if (this._updateCode) {
            return this._updateCode
        }

        this._updateCode = await session.prepareQuery(`
        DECLARE $phone AS Utf8;
        DECLARE $sms_code AS Uint32;
        DECLARE $sms_code_expiration AS Datetime;

        UPDATE users 
        SET sms_code=$sms_code, sms_code_expiration=$sms_code_expiration
        WHERE phone=$phone;`)
        return this._updateCode;
    }

    public async insertOrder(session: Session): Promise<Ydb.Table.PrepareQueryResult> {
        if (this._insertOrder) {
            return this._insertOrder;
        }
        this._insertOrder = await session.prepareQuery(`
        DECLARE $order_id AS String;
        DECLARE $user_id AS String;
        DECLARE $order_ids AS List<String>;
        
        INSERT INTO orders(id, hasPaid, isCompleted, user_id, price)
        
        SELECT $order_id, false, false, $user_id, SUM(order_item.quantity * product.price)
        FROM order_items AS order_item
        
        INNER JOIN products AS product ON (order_item.product_id==product.id)
        WHERE order_item.id in $order_ids;`)
        return this._insertOrder;
    }

    public async insertOrderItems() {

    }
}

interface OrderItem {
    id: Buffer,

}
