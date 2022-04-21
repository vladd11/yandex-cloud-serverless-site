import json
import os
from typing import Any, Dict

import ydb

from functions.add_order import add_order
from functions.auth import register, verify, login
from functions.lambda_queries import Queries

driver = ydb.Driver(endpoint=os.getenv('ENDPOINT'), database=os.getenv('DATABASE'))
driver.wait(fail_fast=True, timeout=5)
# Create the session pool instance to manage YDB sessions.
pool = ydb.SessionPool(driver)

queries = Queries()
pool.retry_operation_sync(queries.prepare)


def handler(event, context):
    body = json.loads(event['body'])

    # auth(pool, queries, "+79170324874", "vld")
    method = body['method']
    if method == 'add_order':
        uid = verify(body['token'])
        if uid is not None:
            return add_order(pool, queries, body, uid)
        else:
            return {'statusCode': 401, 'body': ''}
    elif method == 'login':
        return login(pool, queries, body['phone'], body['password'])
    elif method == 'register':
        return register(pool, queries, body['phone'], body['password'])

    return {
        'statusCode': 404,
        'body': ''
    }