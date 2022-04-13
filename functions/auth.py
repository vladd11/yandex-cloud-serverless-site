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

jwt = PyJWT()

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


def register_query(session: ydb.Session, queries: Queries, uid: bytes, phone: str, password: str):
    session.transaction().execute(queries.add_user,
                                  {'$phone': phone,
                                   '$password': bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()),
                                   '$id': uid,
                                   '$sms_code': random.randint(100000, 999999),
                                   '$sms_code_expiration': int(time.time()) + 600},
                                  commit_tx=True)


def register(pool: ydb.SessionPool, queries: Queries, phone: str, password: str) -> Dict[str, Any]:
    uid = uuid.uuid4()

    try:
        pool.retry_operation_sync(register_query, None, queries, uid.bytes, phone, password)
    except PreconditionFailed:
        return {'statusCode': 401}
    return {
        'statusCode': 200,
        'body': jwt.encode({'id': str(uid), 'phone': phone}, SECRET_KEY, algorithm="HS256"),
    }
