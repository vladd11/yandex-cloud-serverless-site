import os

import boto3


class Deployer:
    def __init__(self, bucket_name=os.environ.get("BUCKET_NAME")):

        self.bucket_name = bucket_name

        session = boto3.session.Session()
        self.s3 = session.client(
            service_name='s3',
            endpoint_url='https://storage.yandexcloud.net'
        )

    def add_page(self, page_name: str, page_body: str, storage_class='COLD'):
        self.s3.put_object(Bucket=self.bucket_name, Key=page_name, Body=page_body, StorageClass=storage_class)
