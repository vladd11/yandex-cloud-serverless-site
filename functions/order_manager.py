import uuid
from typing import List, Dict, Any

import ydb
from ydb import Session

from common.order_product import OrderProduct
from functions.auth import Auth
from functions.exceptions import WrongJWTTokenException, AuthIsRequired
from functions.lambda_queries import Queries


class OrderManager:
    def __init__(self, pool: ydb.SessionPool, queries: Queries, auth: Auth):
        self.auth = auth
        self.queries = queries
        self.pool = pool

    @staticmethod  # This hack is required because I have no another ways to pass self variable
    def add_order_query(session: Session, self, products: List[OrderProduct], user_uid: str):
        order_uid = uuid.uuid4().bytes

        insert_query, values = self.queries.generate_order_item_insert_query(products, order_uid)
        session.transaction().execute(session.prepare(insert_query), values, commit_tx=True)

        session.transaction().execute(self.queries.insert_order, {"$order_id": order_uid, "$user_id": user_uid},
                                      commit_tx=True)

    def add_order(self, products: List[Dict[str, Any]], address: str, context: Dict[str, Any]):
        user_uid = context.get('user_uid')
        if user_uid is None:
            raise AuthIsRequired()

        for index, product_dict in enumerate(products):
            # I don't know why it shows here
            # noinspection PyTypeChecker
            products[index] = OrderProduct(uuid.UUID(product_dict['id']).bytes, product_dict['count'])

        self.pool.retry_operation_sync(self.add_order_query, None, self, products, user_uid)
        # Here you may return order items to make sure that user see actual prices/etc.
