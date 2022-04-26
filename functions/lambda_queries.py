import uuid

from ydb import Session


class Queries:
    def __init__(self):
        self.add_user = None
        self.select_smscode = None
        self.insert_order = None
        self.insert_order_items = None

    def prepare(self, session: Session):
        self.add_user = session.prepare('''
        DECLARE $id AS String;
        DECLARE $sms_code AS Uint32;
        DECLARE $sms_code_expiration AS Datetime;
        DECLARE $phone AS Utf8;
        
        INSERT INTO users(id, phone, sms_code, sms_code_expiration)
        VALUES ($id, $phone, $sms_code, $sms_code_expiration);
        ''')

        self.select_smscode = session.prepare('''
        DECLARE $phone AS Utf8;
        
        SELECT id, sms_code FROM users WHERE phone=$phone;''')

        self.insert_order_items = session.prepare(
            '''
            DECLARE $order_item_id AS String;
            DECLARE $order_id AS String;
            DECLARE $product_id AS String;
            
            INSERT INTO order_items(id, order_id, product_id) 
            VALUES ($order_item_id, $order_id, $product_id);'''
        )

        self.insert_order = session.prepare(
            '''
            DECLARE $order_id AS String;
            DECLARE $user_id AS String;
            
            INSERT INTO orders(id, hasPaid, isCompleted, user_id, price)
            SELECT $order_id, false, false, $user_id, SUM(order_item.quantity * product.price)
            
            FROM products AS product
            
            INNER JOIN order_items AS order_item USING (id)
            WHERE order_item.order_id==$order_id''')

    @staticmethod
    def generate_order_item_insert_query(products, order_uid):
        ranges = range(len(products))

        query = 'DECLARE $order_id AS String;\n'
        query = query + ''.join(
            f'''
        DECLARE $a{i}_id AS String;
        DECLARE $a{i}_product_id AS String;
        DECLARE $a{i}_quantity AS Uint32;
                ''' for i in ranges)
        query += '''
                INSERT INTO order_items(id, order_id, product_id, quantity)
                VALUES '''
        query += ''.join(f'($a{i}_id, $order_id, $a{i}_product_id, $a{i}_quantity),\n' for i in ranges)
        query = query[:len(query) - 2]

        order_items = [uuid.uuid4().bytes for _ in ranges]

        values = {"$order_id": order_uid}
        for index, product in enumerate(products):
            values[f"$a{index}_id"] = order_items[index]
            values[f"$a{index}_product_id"] = product.uid
            values[f"$a{index}_quantity"] = product.count

        return query, values

