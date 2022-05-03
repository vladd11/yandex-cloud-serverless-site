import importlib
import logging
import os
import random
import time
import uuid
from typing import Dict, Any

import ydb
from jwt import PyJWT, InvalidSignatureError, DecodeError
from ydb import PreconditionFailed

from functions.exceptions import WrongJWTTokenException, AuthIsRequired, \
    WrongSMSCode, SMSCodeExpired, PhoneAlreadyInUse
from functions.lambda_queries import Queries

jwt = PyJWT()


def login_required(f):
    def wrapper(*args, **kwargs):
        user_uid = kwargs['context'].get('user_uid')
        if user_uid is None:
            raise AuthIsRequired()
        return f(*args, **kwargs)

    return wrapper


def loggable(func):
    """
    Decorator function that will record function calls
    IMPORTANT: provide context as keyword argument
    """

    def wrapper(*args, **kwargs):
        context = kwargs['context']
        logging.info(f'{func.__name__} is called from {context["sourceIp"]}, {context["userAgent"]}')
        return func(*args, **kwargs)

    return wrapper


class Auth:
    def __init__(self, queries: Queries, pool: ydb.SessionPool):
        self.pool = pool
        self.queries = queries

        self.SMS_CODE_EXPIRATION_TIME = os.environ.get('SMS_CODE_EXPIRATION_TIME') or 600

        sms_code_length = os.environ.get('SMS_CODE_LENGTH') or 6
        self.SMS_CODE_RANDMIN = 10 ** (sms_code_length - 1)
        self.SMS_CODE_RANDMAX = (10 ** sms_code_length) - 1

        self.sms = importlib.import_module(f'sms.{os.environ.get("SMS_CLASS") or "smsc_ru"}')

        self.SECRET_KEY = os.environ.get("SECRET_KEY")

    @loggable
    def verify(self, token: str, context: Dict[str, Any]) -> Dict[str, Any]:
        try:
            decoded = jwt.decode(token, self.SECRET_KEY, algorithms=["HS256"])

            context['user_uid'] = uuid.UUID(decoded['id']).bytes
            return decoded
        except (InvalidSignatureError, DecodeError) as e:
            raise WrongJWTTokenException()

    @staticmethod
    def send_code_query(session: ydb.Session, self, phone: str, code: int):
        session.transaction().execute(self.queries.update_code(session),
                                      {'$phone': phone,
                                       '$sms_code': code,
                                       '$sms_code_expiration': int(time.time()) + self.SMS_CODE_EXPIRATION_TIME},
                                      commit_tx=True)

    @loggable
    def send_code(self, phone: str, context: Dict[str, Any]):
        code = random.randint(self.SMS_CODE_RANDMIN, self.SMS_CODE_RANDMAX)

        self.pool.retry_operation_sync(self.send_code_query, None, self, phone, code)
        self.sms.send_sms(phone,
                          f'Your SMS code is: {code}',
                          context['sourceIp'])

    @staticmethod
    def check_code_query(session: ydb.Session, self, code: int, phone: str):
        result = session.transaction().execute(self.queries.select_smscode(session), {"$phone": phone})

        rows = result[0].rows
        if len(rows) != 0:
            if code == rows[0]['sms_code']:
                if time.time() < rows[0]['sms_code_expiration']:
                    return result[0].rows[0]['id'], result[0].rows[0]['verified']
                else:
                    raise SMSCodeExpired()

        raise WrongSMSCode()

    @loggable
    def check_code(self, phone: str, code: int, context: Dict[str, Any]):
        if self.SMS_CODE_RANDMIN <= code <= self.SMS_CODE_RANDMAX:
            uid, verify = self.pool.retry_operation_sync(self.check_code_query, None, self, code, phone)

            context['user_uid'] = uid

            return {
                "token": jwt.encode(
                    {
                        'id': uid.hex(),
                        'phone': phone
                    },
                    self.SECRET_KEY,
                    algorithm="HS256")
            }
        else:
            raise WrongSMSCode()

    @staticmethod
    def login_query(session: ydb.Session, self, uid: bytes, phone: str, sms_code: int):
        session.transaction().execute(self.queries.add_user(session),
                                      {'$phone': phone,
                                       '$id': uid,
                                       '$sms_code': sms_code,
                                       '$sms_code_expiration': int(time.time()) + self.SMS_CODE_EXPIRATION_TIME},
                                      commit_tx=True)

    @loggable
    def login(self, phone: str, verify: bool, context: Dict[str, Any]) -> Dict[str, Any]:
        try:
            uid = uuid.uuid4()

            sms_code = random.randint(self.SMS_CODE_RANDMIN, self.SMS_CODE_RANDMAX)

            self.pool.retry_operation_sync(self.login_query, None, self, uid.bytes, phone, sms_code)

            context['user_uid'] = uid.bytes

            if verify:
                self.send_code(phone, context)

            return {
                "token": jwt.encode({'id': str(uid), 'phone': phone}, self.SECRET_KEY, algorithm="HS256")
            }
        except PreconditionFailed:
            self.send_code(phone, context=context)
            raise PhoneAlreadyInUse()
