import json
import os

import ydb
from ydb import Session

import queries
from product import Product

driver = ydb.Driver(endpoint=os.getenv('YDB_ENDPOINT'), database=os.getenv('YDB_DATABASE'))
driver.wait(fail_fast=True, timeout=5)
# Create the session pool instance to manage YDB sessions.
pool = ydb.SessionPool(driver)


def query(session: Session, product: Product):
    session.transaction(ydb.SerializableReadWrite()).execute(
        queries.create_product,
        {"$id": product.uid,
         "$description": product.description,
         "$title": product.title, "$price": product.price * 100},
        commit_tx=True)


def handler(event, context):
    body = json.loads(event['body'])
    pool.retry_operation_sync(query, Product(body['']))
    return {
        'statusCode': 200,
        'body': 0,
    }


if __name__ == '__main__':
    print(handler({
        "httpMethod": "POST",
        "headers": {
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Content-Length": "206",
            "Content-Type": "application/json",
            "Host": "functions.yandexcloud.net",
            "User-Agent": "PostmanRuntime/7.28.4",
            "X-Forwarded-For": "213.178.49.186",
            "X-Real-Remote-Address": "[213.178.49.186]:64385",
            "X-Request-Id": "d154ca44-c9c0-423c-9a20-8521e0b99167",
            "X-Trace-Id": "2fec7319-a4c6-4c2a-9561-debfd49d0715"
        },
        "url": "",
        "params": {},
        "multiValueParams": {},
        "pathParams": {},
        "multiValueHeaders": {
            "Accept": [
                "*/*"
            ],
            "Accept-Encoding": [
                "gzip, deflate, br"
            ],
            "Content-Length": [
                "206"
            ],
            "Content-Type": [
                "application/json"
            ],
            "Host": [
                "functions.yandexcloud.net"
            ],
            "User-Agent": [
                "PostmanRuntime/7.28.4"
            ],
            "X-Forwarded-For": [
                "213.178.49.186"
            ],
            "X-Real-Remote-Address": [
                "[213.178.49.186]:64385"
            ],
            "X-Request-Id": [
                "d154ca44-c9c0-423c-9a20-8521e0b99167"
            ],
            "X-Trace-Id": [
                "2fec7319-a4c6-4c2a-9561-debfd49d0715"
            ]
        },
        "queryStringParameters": {},
        "multiValueQueryStringParameters": {},
        "requestContext": {
            "identity": {
                "sourceIp": "213.178.49.186",
                "userAgent": "PostmanRuntime/7.28.4"
            },
            "httpMethod": "POST",
            "requestId": "d154ca44-c9c0-423c-9a20-8521e0b99167",
            "requestTime": "9/Apr/2022:14:01:00 +0000",
            "requestTimeEpoch": 1649512860
        },
        "body": "{\r\n    \"products\": [\r\n        {\r\n            \"id\": \"e5a48391-c23d-4106-9604-5397fea24489\",\r\n            \"count\": 1\r\n        }\r\n    ],\r\n    \"address\": \"Самара, Томашевский тупик, 16\"\r\n}",
        "isBase64Encoded": False
    },
        {}))
