import base64
import json
import logging
import os

import ydb
# It's in ./requirements.txt for functions
# noinspection PyPackageRequirements
from jsonrpc import Dispatcher, JSONRPCResponseManager

from functions.auth import Auth
from functions.lambda_queries import Queries
from functions.order_manager import OrderManager

cors_headers = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, "
                                                "Content-Type, Access-Control-Request-Method, "
                                                "Access-Control-Request-Headers",
                "Content-Type": "application/json"}

driver = ydb.Driver(endpoint=os.getenv('ENDPOINT'), database=os.getenv('DATABASE'))
driver.wait(fail_fast=True, timeout=5)
# Create the session pool instance to manage YDB sessions.
pool = ydb.SessionPool(driver)

queries = Queries()

dispatcher = Dispatcher()

auth = Auth(queries, pool)
orderManager = OrderManager(pool, queries)

dispatcher['verify'] = auth.verify
dispatcher['check_code'] = auth.check_code
dispatcher['login'] = auth.login
dispatcher['send_code'] = auth.send_code

dispatcher['add_order'] = orderManager.add_order

logging.getLogger().setLevel(logging.INFO)


def handler(event, context):
    identity = event["requestContext"]["identity"]

    if event['httpMethod'] == 'OPTIONS':
        logging.info(f'Preflight request from {identity["sourceIp"]}, {identity["userAgent"]}')
        return {'statusCode': 200,
                'headers': cors_headers}

    body = event['body']

    if event['isBase64Encoded']:
        body = base64.b64decode(event['body'])

    return {
        'statusCode': 200,
        'body': JSONRPCResponseManager.handle(body, dispatcher,
                                              initial_context=identity).json,
        'headers': cors_headers
    }
