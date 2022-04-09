class Product:
    def __init__(self, title: str = None, description: str = None, price: float = None, uid: bytes = None):
        self.uid = uid
        self.price = price
        self.description = description
        self.title = title
