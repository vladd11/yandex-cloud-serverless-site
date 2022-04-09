class Queries:
    def __init__(self, session):
        self.update_product = session.prepare(
            '''
            DECLARE $id AS String;
            DECLARE $title AS Utf8;
            DECLARE $description AS Utf8;
            DECLARE $price AS Uint64;
            
            UPDATE products 
            SET title=$title, description=$description, price=$price
            WHERE id=$id;''')
        self.get_products = session.prepare('SELECT (title,description,price,id) FROM products;')
        self.create_product = session.prepare(
            '''
            DECLARE $id AS String;
            DECLARE $title AS Utf8;
            DECLARE $description AS Utf8;
            DECLARE $price AS Uint64;
            
            INSERT INTO products(id, description, title, price) VALUES ($id, $description, $title, $price);''')

        self.remove_product = session.prepare('''
            DECLARE $uid AS String;
    
            DELETE FROM products WHERE id=$uid;''')
