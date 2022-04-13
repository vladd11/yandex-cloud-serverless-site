import uuid
from typing import List, Dict

import ydb
from ydb import Session

from common.order_product import OrderProduct
from common.user import User
from functions.lambda_queries import Queries


def query(session: Session, queries: Queries, products: List[OrderProduct], user: User):
    for product in products:
        if product.count > 1:
            for i in range(product.count - 1):
                products.append(product)

    order_id = uuid.uuid4().bytes
    session.transaction(ydb.SerializableReadWrite()).execute(
        queries.insert_order,
        {"$order_id": order_id,
         "$user_id": user.uid,
         "$products": list(product.uid for product in products)},
        commit_tx=True)
    for idx, product in enumerate(products):
        if idx == len(products) - 1:
            session.transaction(ydb.SerializableReadWrite()).execute(queries.insert_order_items,
                                                                     {"$order_item_id": uuid.uuid4().bytes,
                                                                      "$order_id": order_id,
                                                                      "$product_id": product.uid},
                                                                     commit_tx=True)
        else:
            session.transaction(ydb.SerializableReadWrite()).execute(queries.insert_order_items, {}, commit_tx=False)


def add_order(pool: ydb.SessionPool, queries: Queries, body, user_uid: str):
    products = []
    for product in body['products']:
        products.append(OrderProduct(uid=uuid.UUID(product['id']).bytes, count=product['count']))

    pool.retry_operation_sync(query, None, queries, products, User(uuid.UUID(user_uid).bytes))
    return {
        'statusCode': 200,
        'body': 0,
    }
