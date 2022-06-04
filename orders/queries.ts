import {OrderItem} from "../types/product";
import {Types} from "ydb-sdk";

export namespace OrderQueries {
    // language=SQL
    export const insertOrder = `
    DECLARE $items AS List<Struct<id: String, order_id: String, product_id: String, quantity: Uint32>>;
    DECLARE $order_id AS String;
    DECLARE $user_id AS String;
    DECLARE $phone AS Utf8;
    DECLARE $d_time AS Datetime;
    DECLARE $payment_method AS Uint8;
    
    $table = (
    SELECT (order_item.quantity * product.price), order_item.id as id,
            product.price as price,
            order_item.quantity as quantity,
            product.image_uri as image_uri,
            product.title as title
            
    FROM AS_TABLE($items) AS order_item
    INNER JOIN products AS product
    ON (order_item.product_id==product.id)
    );
    
    UPSERT INTO order_items(id, order_id, product_id, quantity, price) 
    SELECT order_item.id, order_item.order_id, order_item.product_id, order_item.quantity, prices.column0
    FROM AS_TABLE($items) as order_item
    
    INNER JOIN $table AS prices
    ON (prices.id==order_item.id);
    
    UPSERT INTO orders(id, hasPaid, isCompleted, user_id, price, phone, payment_method, delivery_time)
    SELECT $order_id as id,
           false as hasPaid,
           false as isCompleted,
           $user_id as user_id,
           SUM(column0) as price,
           $phone as phone,
           $payment_method as payment_method,
           $d_time as delivery_time
    FROM $table;
    
    SELECT title, image_uri, price, quantity FROM $table;`

    export function createInsertOrderParams(items: Array<OrderItem>, userID: Buffer, orderID: Buffer, phone: string, paymentMethod: number, time: number) {
        return {
            "$items": createItemsParams(items, orderID),
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
            },
            "$phone": {
                type: Types.UTF8,
                value: {
                    textValue: phone
                }
            },
            "$payment_method": {
                type: Types.UINT8,
                value: {
                    uint32Value: paymentMethod
                }
            },
            "$d_time": {
                type: Types.DATETIME,
                value: {
                    uint32Value: time
                }
            }
        }
    }

    export function createItemsParams(items: Array<OrderItem>, orderID: Buffer) {
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

    //language=SQL
    export const getOrder = `
    DECLARE $id AS String;
    
    SELECT orders.id, hasPaid, isCompleted, price, user_id, phone, delivery_time, payment_method
    FROM orders
    
    WHERE orders.id=$id;
    
    SELECT 
    (order_item.price / quantity), quantity,
    product.image_uri, product.title
    
    FROM order_items VIEW idx_order_id AS order_item
    
    INNER JOIN products AS product
    ON order_item.product_id==product.id
    
    WHERE order_id=$id;`;

    export function createGetOrderParams(orderID: Buffer) {
        return {
            "$id": {
                type: Types.STRING,
                value: {
                    bytesValue: orderID
                }
            }
        }
    }
}