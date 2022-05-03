import uuid

from ydb import Session


class Queries:
    def __init__(self):
        self._update_code = None
        self._add_user = None
        self._select_smscode = None
        self._insert_order = None
        self._insert_order_items = None

    def insert_order(self, session: Session):
        if not self._insert_order:
            self._insert_order = session.prepare(
                '''
    DECLARE $order_id AS String;
    DECLARE $user_id AS String;
    DECLARE $order_ids AS List<String>;
    INSERT INTO orders(id, hasPaid, isCompleted, user_id, price)
    SELECT $order_id, false, false, $user_id, SUM(order_item.quantity * product.price)
    FROM order_items AS order_item
    INNER JOIN products AS product ON (order_item.product_id==product.id)
    WHERE order_item.id in $order_ids;''')
        return self._insert_order

    def add_user(self, session: Session):
        if not self._add_user:
            self._add_user = session.prepare('''
DECLARE $id AS String;
DECLARE $sms_code AS Uint32;
DECLARE $sms_code_expiration AS Datetime;
DECLARE $phone AS Utf8;

INSERT INTO users(id, phone, sms_code, sms_code_expiration)
VALUES ($id, $phone, $sms_code, $sms_code_expiration);''')
        return self._add_user

    def insert_order_items(self, session: Session):
        if not self._insert_order_items:
            self._insert_order_items = session.prepare(
                '''
                DECLARE $order_item_id AS String;
                DECLARE $order_id AS String;
                DECLARE $product_id AS String;

                INSERT INTO order_items(id, order_id, product_id) 
                VALUES ($order_item_id, $order_id, $product_id);'''
            )
        return self._insert_order_items

    def select_smscode(self, session: Session):
        if not self._select_smscode:
            self._select_smscode = session.prepare('''
DECLARE $id AS String;
DECLARE $sms_code AS Uint32;
DECLARE $sms_code_expiration AS Datetime;
DECLARE $phone AS Utf8;

INSERT INTO users(id, phone, sms_code, sms_code_expiration)
VALUES ($id, $phone, $sms_code, $sms_code_expiration);''')

        return self._select_smscode

    def update_code(self, session: Session):
        if not self._update_code:
            self._update_code = session.prepare('''
                DECLARE $phone AS Utf8;
                DECLARE $sms_code AS Uint32;
                DECLARE $sms_code_expiration AS Datetime;

                UPDATE users 
                SET sms_code=$sms_code, sms_code_expiration=$sms_code_expiration
                WHERE phone=$phone;''')
        return self._update_code

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

        return query, values, order_items
