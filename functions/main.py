import json
import os

import ydb
# It's in ./requirements.txt for functions
# noinspection PyPackageRequirements
from jsonrpc import dispatcher, JSONRPCResponseManager

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
pool.retry_operation_sync(queries.prepare)

auth = Auth(queries, pool)
orderManager = OrderManager(pool, queries, auth)

dispatcher['add_order'] = orderManager.add_order
dispatcher['login'] = auth.login
dispatcher['register'] = auth.register


def handler(event, context):
    if event['httpMethod'] == 'OPTIONS':
        return {'statusCode': 200,
                'headers': cors_headers}
    return {
        'statusCode': 200,
        'body': JSONRPCResponseManager.handle(event['body'], dispatcher).json,
        'headers': cors_headers
    }


if __name__ == '__main__':
    print(handler(json.load(open('test_request.json')), None))
