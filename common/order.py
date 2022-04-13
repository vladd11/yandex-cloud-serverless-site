from typing import List

from common.product import Product
from common.user import User


class Order:
    def __init__(self, uid: bytes, price: float, user: User, products: List[Product], hasPaid: bool, isCompleted: bool):
        self.isCompleted = isCompleted
        self.hasPaid = hasPaid
        self.products = products
        self.price = price
        self.id = uid
        self.user = user
