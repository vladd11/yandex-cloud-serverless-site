import {OrderItem} from "../types/product";
import {Types} from "ydb-sdk";

export namespace OrderQueries {
    // language=SQL
    export const insertOrder = `
    DECLARE $items AS List<Struct<id: String, order_id: String, product_id: String, quantity: Uint32>>;
    DECLARE $order_id AS String;
    DECLARE $user_id AS String;
    DECLARE $phone AS String;
    DECLARE $payment_method AS Uint8;
    
    UPSERT INTO order_items(id, order_id, product_id, quantity) 
    SELECT id, order_id, product_id, quantity FROM AS_TABLE($items);
    
    $table = (
    SELECT $order_id, false, false, $user_id, SUM(order_item.quantity * product.price)
    FROM AS_TABLE($items) AS order_item
    INNER JOIN products AS product
    ON (order_item.product_id==product.id)
    );
    
    UPSERT INTO orders(id, hasPaid, isCompleted, user_id, price, phone, payment_method)
    SELECT column0, column1, column2, column3, column4, $phone, $payment_method FROM $table;
    
    SELECT column4 FROM $table;`

    export function createInsertOrderParams(items: Array<OrderItem>, userID: Buffer, orderID: Buffer, phone: string, paymentMethod: number) {
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
                type: Types.STRING,
                value: {
                    textValue: phone
                }
            },
            "$payment_method": {
                type: Types.UINT8,
                value: {
                    uint32Value: paymentMethod
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

    export const getOrder = `
    DECLARE $id AS String;
    
    SELECT orders.id, hasPaid, isCompleted, price, user_id, phone, delivery_time, payment_method
    FROM orders
    
    WHERE orders.id=$id;
    
    SELECT 
    order_item.price, quantity,
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