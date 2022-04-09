from typing import List

import ydb
import ydb.iam

import queries
from product import Product


class Database:
    PRODUCT_COLUMNS = ["id", "title", "description"]

    def __init__(self, endpoint, database):
        self.database = database
        self.driver = ydb.Driver(endpoint=endpoint, database=database,
                                 credentials=ydb.iam.ServiceAccountCredentials.from_file(
                                     "C:\\Users\\rozhk\\sa.json",
                                 ), )
        self.driver.wait(timeout=10, fail_fast=True)
        # with ydb.SessionPool(driver) as self.pool:
        self.session = self.driver.table_client.session().create()
        self.queries = queries.Queries(self.session)
        # noinspection PyBroadException
        try:
            table = self.session.describe_table(database + '/products')
            for i in table.columns:
                for j in self.PRODUCT_COLUMNS:
                    if i.name == j:
                        self.PRODUCT_COLUMNS.remove(j)

            if len(self.PRODUCT_COLUMNS) != 0:
                raise Exception(f"Missing columns: {self.PRODUCT_COLUMNS}")
        except Exception:
            self.session.create_table(
                database + '/products',
                ydb.TableDescription()
                .with_column(ydb.Column('id', ydb.OptionalType(ydb.PrimitiveType.String)))  # UUIDv4, bytes
                .with_column(ydb.Column('title', ydb.OptionalType(ydb.PrimitiveType.Utf8)))
                .with_column(ydb.Column('description', ydb.OptionalType(ydb.PrimitiveType.Utf8)))
                .with_column(ydb.Column('price', ydb.OptionalType(ydb.PrimitiveType.Uint64)))
                # .with_column(ydb.Column('price', ydb.OptionalType(ydb.DecimalType)))
                .with_primary_key('id')
            )

    def create_product(self, product: Product):
        result = self.session.transaction(ydb.SerializableReadWrite()).execute(
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
        self.session.transaction().execute(self.queries.remove_product, {"$uid": uid})

    def disconnect(self):
        self.driver.stop(10)
