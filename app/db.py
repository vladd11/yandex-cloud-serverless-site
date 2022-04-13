import uuid
from typing import List

import ydb
import ydb.iam

from app import queries
from common.order import Order
from common.product import Product
from common.user import User


class Database:
    PRODUCT_COLUMNS = ["id", "title", "description"]

    def __init__(self, endpoint, database):
        self.database = database
        self.driver = ydb.Driver(endpoint=endpoint, database=database,)
        self.driver.wait(timeout=10, fail_fast=True)
        # with ydb.SessionPool(driver) as self.pool:
        self.session = self.driver.table_client.session().create()
        self.queries = queries.Queries(self.session)

    def create_tables(self):
        self.session.transaction().execute('''
        CREATE TABLE `orders`
        (
            `id` String,
            `hasPaid` Bool,
            `isCompeted` Bool,
            `price` Uint64,
            `user_id` String,
            PRIMARY KEY (`id`),
            INDEX idx_user_id GLOBAL ON (user_id)
        );''')

        self.session.transaction().execute('''
        CREATE TABLE `users`
        (
            `id` String,
            `phone` Utf8,
            PRIMARY KEY (`id`)
        );''')

    def create_product(self, product: Product):
        self.session.transaction(ydb.SerializableReadWrite()).execute(
            self.queries.create_product,
            {"$id": product.uid,
             "$description": product.description,
             "$title": product.title, "$price": product.price * 100},
            commit_tx=True)

    def get_products(self) -> List[Product]:
        result = self.session.transaction().execute(self.queries.get_products)
        products = []
        for row in result:
            row = row.rows[0]['column0']
            products.append(Product(title=row[0], description=row[1], price=row[2] / 100, uid=row[3]))
        return products

    def update_product(self, product):
        self.session.transaction().execute(self.queries.update_product,
                                           parameters={"$id": product.uid,
                                                       "$title": product.title,
                                                       "$price": product.price,
                                                       "$description": product.description}, commit_tx=True)

    def remove_product(self, uid: bytes):
        self.session.transaction().execute(self.queries.remove_product,
                                           {"$uid": uid},
                                           commit_tx=True)

    def disconnect(self):
        self.driver.stop(10)

    def create_user(self, phone: str) -> User:
        """
            Create user with specified phone number
            :param phone Phone number of user
        """

        uid = uuid.uuid4().bytes
        self.session.transaction().execute(self.queries.create_user,
                                           {"$id": uid, "$phone": phone},
                                           commit_tx=True)
        return User(uid, phone)

    def create_order(self, user: User, products: List[Product]) -> Order:
        uid = uuid.uuid4().bytes

        if len(products) != 1:
            price = sum(product.price for product in products)
        else:
            price = products[0].price

        self.session.transaction().execute(self.queries.add_orders,
                                           {'$id': uid,
                                            '$price': price,
                                            '$user_id': user.uid}, commit_tx=True)
        return Order(uid, price, user, products, False, False)
