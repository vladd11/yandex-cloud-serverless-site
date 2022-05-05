import json
import os
import uuid

import ydb

driver = ydb.Driver(endpoint=os.getenv('ENDPOINT'), database=os.getenv('DATABASE'))
driver.wait(fail_fast=True, timeout=5)

pool = ydb.SessionPool(driver)


def operation(session: ydb.Session):
    return session.transaction().execute('SELECT * FROM products;')


def handler(event, context):
    result = pool.retry_operation_sync(operation)
    products = []

    for row in result[0].rows:
        products.append({
            'Category': row['category'],
            'Description': row['description'],
            'ProductID': str(uuid.UUID(bytes_le=row['id'])),
            'ImageURI': row['image_uri'],
            'Price': row['price'] / 100,
            'Title': row['title']
        })

    return {
        'statusCode': 200,
        'body': json.dumps(products),
    }
