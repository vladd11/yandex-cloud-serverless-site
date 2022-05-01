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

from functions.exceptions import LoginIsNotUniqueException, WrongCredentials, WrongJWTTokenException, AuthIsRequired
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
    def login_query(session: ydb.Session, self, phone: str, code: str) -> str:
        """
        Check password by user phone
        :return: UUID string
        """
        result = session.transaction().execute(self.queries.select_smscode, {"$phone": phone})

        rows = result[0].rows
        if len(rows) != 0:
            if code == rows[0]['sms_code']:
                return result[0].rows[0]['id']

    @loggable
    def login(self, phone: str, code: str, context: Dict[str, Any]) -> Dict[str, Any]:
        uid = self.pool.retry_operation_sync(self.login_query, None, self, phone, code)
        if not uid:
            raise WrongCredentials()

        context['user_uid'] = uid

        return {
            "token": jwt.encode(
                {
                    'id': uid.hex(),
                    'phone': phone
                },
                self.SECRET_KEY,
                algorithm="HS256"),
            'phone': phone
        }

    @staticmethod
    def register_query(session: ydb.Session, self, uid: bytes, phone: str, sms_code: str):
        session.transaction().execute(self.queries.add_user,
                                      {'$phone': phone,
                                       '$id': uid,
                                       '$sms_code': sms_code,
                                       '$sms_code_expiration': int(time.time()) + self.SMS_CODE_EXPIRATION_TIME},
                                      commit_tx=True)

    @loggable
    def register(self, phone: str, verify: bool, context: Dict[str, Any]) -> str:
        uid = uuid.uuid4()

        try:
            sms_code = random.randint(self.SMS_CODE_RANDMIN, self.SMS_CODE_RANDMAX)

            self.pool.retry_operation_sync(self.register_query, None, self, uid.bytes, phone, sms_code)

            context['user_uid'] = uid.bytes

            if verify:
                self.sms.send_sms(phone,
                                  f'Your SMS code is: {sms_code}',
                                  context['sourceIp'])

        except PreconditionFailed:
            raise LoginIsNotUniqueException(phone)
        return jwt.encode({'id': str(uid), 'phone': phone}, self.SECRET_KEY, algorithm="HS256")
