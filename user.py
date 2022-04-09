class User:
    def __init__(self, uid: bytes, phone: str = None):
        self.uid = uid
        self.phone = phone
