import importlib
import os
import random
import time
import uuid
from typing import Any, Dict, Optional

import bcrypt
import ydb
from jwt import PyJWT, InvalidSignatureError
from ydb import PreconditionFailed
from functions.lambda_queries import Queries
import sms

jwt = PyJWT()


class Auth:
    def __init__(self, queries: Queries, pool: ydb.SessionPool):
        self.pool = pool
        self.queries = queries

        self.SMS_VERIFICATION_ENABLED = bool(os.environ.get('SMS_VERIFICATION_ENABLED'))
        self.SMS_CODE_EXPIRATION_TIME = os.environ.get('SMS_CODE_EXPIRATION_TIME') or 600

        sms_code_length = os.environ.get('SMS_CODE_LENGTH') or 6
        self.SMS_CODE_RANDMIN = 10 ** (sms_code_length - 1)
        self.SMS_CODE_RANDMAX = (10 ** sms_code_length) - 1

        self.sms = importlib.import_module(f'sms.{os.environ.get("SMS_CLASS") or "smsc_ru"}')

        self.SECRET_KEY = os.environ.get("SECRET_KEY")

    def verify(self, token: str) -> Optional[str]:
        try:
            decoded = jwt.decode(token, self.SECRET_KEY, algorithms=["HS256"])
            return decoded['id']
        except InvalidSignatureError:
            return None

    @staticmethod
    def login_query(session: ydb.Session, self, phone: str, password: str) -> str:
        """
        Check password by user phone
        :return: UUID string
        """
        result = session.transaction().execute(self.queries.select_password, {"$phone": phone})

        rows = result[0].rows
        if len(rows) != 0:
            if bcrypt.checkpw(password.encode('utf-8'), rows[0]['password']):
                return result[0].rows[0]['id'].hex()

    def login(self, phone: str, password: str) -> Dict[str, Any]:
        uid = self.pool.retry_operation_sync(self.login_query, None, self, phone, password)
        if not uid:
            return {'statusCode': 401, 'body': ''}

        return {
            'statusCode': 200,
            'body': jwt.encode(
                {
                    'id': uid,
                    'phone': phone
                },
                self.SECRET_KEY,
                algorithm="HS256")}

    @staticmethod
    def register_query(session: ydb.Session, self, uid: bytes, phone: str, password: str, sms_code: str):
        session.transaction().execute(self.queries.add_user,
                                      {'$phone': phone,
                                       '$password': bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()),
                                       '$id': uid,
                                       '$sms_code': sms_code,
                                       '$sms_code_expiration': int(time.time()) + self.SMS_CODE_EXPIRATION_TIME},
                                      commit_tx=True)

    def register(self, phone: str, password: str) -> Dict[str, Any]:
        uid = uuid.uuid4()

        try:
            sms_code = random.randint(self.SMS_CODE_RANDMIN, self.SMS_CODE_RANDMAX)

            self.pool.retry_operation_sync(self.register_query, None, self, uid.bytes, phone, password,
                                           sms_code)

            if self.SMS_VERIFICATION_ENABLED:
                self.sms.send_sms(phone, f'Your SMS code is: {sms_code}')
        except PreconditionFailed as e:
            return {'statusCode': 401}
        return {
            'statusCode': 200,
            'body': jwt.encode({'id': str(uid), 'phone': phone}, self.SECRET_KEY, algorithm="HS256"),
        }
