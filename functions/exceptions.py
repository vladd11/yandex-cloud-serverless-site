from jsonrpc.exceptions import JSONRPCDispatchException


class WrongCredentials(JSONRPCDispatchException):
    def __init__(self):
        super(WrongCredentials, self).__init__(1000, "Wrong credentials")


class WrongSMSCode(JSONRPCDispatchException):
    def __init__(self):
        super(WrongSMSCode, self).__init__(1001, f"Wrong SMS code")


class WrongJWTTokenException(JSONRPCDispatchException):
    def __init__(self):
        super(WrongJWTTokenException, self).__init__(1002, "JWT token can't be decrypted")


class AuthIsRequired(JSONRPCDispatchException):
    def __init__(self):
        super(AuthIsRequired, self).__init__(1003, "You should auth to call this function")


class SMSCodeExpired(JSONRPCDispatchException):
    def __init__(self):
        super(SMSCodeExpired, self).__init__(1004, "SMS code expired")


class PhoneAlreadyInUse(JSONRPCDispatchException):
    def __init__(self):
        super(PhoneAlreadyInUse, self).__init__(1005, "Phone already in use")


class CartIsEmpty(JSONRPCDispatchException):
    def __init__(self):
        super(CartIsEmpty, self).__init__(2000, "Cart is empty")
