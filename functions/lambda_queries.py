from ydb import Session


class Queries:
    def __init__(self):
        self.add_user = None
        self.select_password = None
        self.insert_order = None
        self.insert_order_items = None

    def prepare(self, session: Session):
        self.add_user = session.prepare('''
        DECLARE $id AS String;
        DECLARE $password AS String;
        DECLARE $sms_code AS Uint32;
        DECLARE $sms_code_expiration AS Datetime;
        DECLARE $phone AS Utf8;
        
        INSERT INTO users(id, password, phone, sms_code, sms_code_expiration)
        VALUES ($id, $password, $phone, $sms_code, $sms_code_expiration);
        ''')

        self.select_password = session.prepare('''
        DECLARE $phone AS Utf8;
        
        SELECT id, password FROM users WHERE phone=$phone;''')

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
            PRAGMA AnsiInForEmptyOrNullableItemsCollections;

            DECLARE $order_id AS String;
            DECLARE $user_id AS String;
            DECLARE $products AS List<String>;

            INSERT INTO orders(id, hasPaid, isCompleted, user_id, price)
            SELECT $order_id, false, false, $user_id, SUM(products.price) FROM products WHERE products.id IN $products;''')
