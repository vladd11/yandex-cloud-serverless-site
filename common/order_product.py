from common.product import Product


class OrderProduct(Product):
    def __init__(self, title: str = None, description: str = None, price: float = None, uid: bytes = None, count: int = None):
        super().__init__(title, description, price, uid)
        self.count = count

