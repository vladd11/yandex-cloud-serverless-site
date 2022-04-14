class Queries:
    def __init__(self, session):
        self.add_orders = session.prepare('''
        DECLARE $id AS String;
        DECLARE $price AS Uint64;
        DECLARE $user_id AS String;
        
        INSERT INTO orders(id, price, user_id) VALUES ($id, $price, $user_id);''')

        self.create_user = session.prepare('''
        DECLARE $id AS String;
        DECLARE $phone AS Utf8;
        
        INSERT INTO users(id, phone) VALUES ($id, $phone);''')

        self.get_orders_by_id = session.prepare('''
        SELECT `order`.price
        FROM orders view idx_user_id as `order`
        INNER JOIN users AS `user` ON `user`.id==`order`.user_id;''')

        self.update_product = session.prepare(
            '''
            DECLARE $id AS String;
            DECLARE $title AS Utf8;
            DECLARE $description AS Utf8;
            DECLARE $price AS Uint64;
            
            UPDATE products 
            SET title=$title, description=$description, price=$price
            WHERE id=$id;''')

        self.get_products = session.prepare('SELECT (title,description,price,id,image_uri) FROM products;')

        self.create_product = session.prepare(
            '''
            DECLARE $id AS String;
            DECLARE $title AS Utf8;
            DECLARE $image_uri AS Utf8;
            DECLARE $description AS Utf8;
            DECLARE $price AS Uint64;
            
            INSERT INTO products(id, description, title, price, image_uri) VALUES ($id, $description, $title, $price, $image_uri);''')

        self.remove_product = session.prepare('''
            DECLARE $uid AS String;
    
            DELETE FROM products WHERE id=$uid;''')
