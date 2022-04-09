class Product:
    def __init__(self, title: str, description: str, price: float, uid: bytes):
        self.uid = uid
        self.price = price
        self.description = description
        self.title = title
