class Product:
    def __init__(self, title: str = None,
                 description: str = None,
                 price: float = None,
                 uid: bytes = None,
                 image_uri: str = None):
        self.image_uri = image_uri
        self.uid = uid
        self.price = price
        self.description = description
        self.title = title
