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

SMS_VERIFICATION_ENABLED = bool(os.environ.get('SMS_VERIFICATION_ENABLED'))
SMS_CODE_EXPIRATION_TIME = os.environ.get('SMS_CODE_EXPIRATION_TIME') or 600
SMS_CODE_LENGTH = os.environ.get('SMS_CODE_LENGTH') or 6

SMS_CODE_RANDMIN = 10 ** (SMS_CODE_LENGTH - 1)
SMS_CODE_RANDMAX = (10 ** SMS_CODE_LENGTH) - 1

sms = importlib.import_module(f'sms.{os.environ.get("SMS_CLASS") or "smsc_ru"}')

SECRET_KEY = os.environ.get("SECRET_KEY")


def verify_query(session: ydb.Session, queries: Queries, phone: str, password: str) -> str:
    """
    Check password by user phone
    :return: UUID string
    """
    result = session.transaction().execute(queries.select_password, {"$phone": phone})

    if bcrypt.checkpw(password.encode('utf-8'), result[0].rows[0]['password']):
        return result[0].rows[0]['id'].hex()


def verify(token: str) -> Optional[str]:
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return decoded['id']
    except InvalidSignatureError:
        return None


def login(pool: ydb.SessionPool, queries: Queries, phone: str, password: str) -> Dict[str, Any]:
    return {
        'statusCode': 200,
        'body': jwt.encode(
            {'id': pool.retry_operation_sync(verify_query, None, queries, phone, password), 'phone': phone}, SECRET_KEY,
            algorithm="HS256")}


def register_query(session: ydb.Session, queries: Queries, uid: bytes, phone: str, password: str, sms_code: str):
    session.transaction().execute(queries.add_user,
                                  {'$phone': phone,
                                   '$password': bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()),
                                   '$id': uid,
                                   '$sms_code': sms_code,
                                   '$sms_code_expiration': int(time.time()) + SMS_CODE_EXPIRATION_TIME},
                                  commit_tx=True)


def register(pool: ydb.SessionPool, queries: Queries, phone: str, password: str) -> Dict[str, Any]:
    uid = uuid.uuid4()

    try:
        sms_code = random.randint(SMS_CODE_RANDMIN, SMS_CODE_RANDMAX)

        pool.retry_operation_sync(register_query, None, queries, uid.bytes, phone, password, sms_code)

        if SMS_VERIFICATION_ENABLED:
            sms.send_sms(phone, f'Your SMS code is: {sms_code}')
    except PreconditionFailed:
        return {'statusCode': 401}
    return {
        'statusCode': 200,
        'body': jwt.encode({'id': str(uid), 'phone': phone}, SECRET_KEY, algorithm="HS256"),
    }
