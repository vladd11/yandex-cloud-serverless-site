import uuid
from typing import List, Dict, Any

import ydb
from ydb import Session

from common.order_product import OrderProduct
from functions.auth import login_required, loggable
from functions.exceptions import CartIsEmpty
from functions.lambda_queries import Queries


class OrderManager:
    def __init__(self, pool: ydb.SessionPool, queries: Queries):
        self.queries = queries
        self.pool = pool

    @staticmethod  # This hack is required because I have no another ways to pass self variable
    def add_order_query(session: Session, self, products: List[OrderProduct], user_uid: str):
        order_uid = uuid.uuid4().bytes

        insert_query, values, order_item_uids = self.queries.generate_order_item_insert_query(products, order_uid)
        session.transaction().execute(session.prepare(insert_query), values, commit_tx=True)

        session.transaction().execute(self.queries.insert_order,
                                      {"$order_id": order_uid, "$user_id": user_uid, "$order_ids": order_item_uids},
                                      commit_tx=True)

    # noinspection PyPep8Naming
    @login_required
    @loggable
    def add_order(self, products: List[Dict[str, Any]], address: str, paymentMethod: str, context: Dict[str, Any]):
        if len(products) == 0:
            raise CartIsEmpty()

        for index, product_dict in enumerate(products):
            # I don't know why it shows here
            # noinspection PyTypeChecker
            products[index] = OrderProduct(uuid.UUID(product_dict['id']).bytes, product_dict['count'])

        self.pool.retry_operation_sync(self.add_order_query, None, self, products, context['user_uid'])
        # Here you may return order items to make sure that user see actual prices/etc.
        return "https://google.com"
