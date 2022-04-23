from jsonrpc.exceptions import JSONRPCDispatchException


class WrongJWTTokenException(JSONRPCDispatchException):
    def __init__(self):
        super(WrongJWTTokenException, self).__init__(1002, "JWT token can't be decrypted")


class LoginIsNotUniqueException(JSONRPCDispatchException):
    def __init__(self, login):
        super(LoginIsNotUniqueException, self).__init__(1001, f"Login {login} is not unique!")


class WrongCredentials(JSONRPCDispatchException):
    def __init__(self):
        super(WrongCredentials, self).__init__(1000, "Wrong credentials")
