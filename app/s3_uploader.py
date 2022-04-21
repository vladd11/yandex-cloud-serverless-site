import glob
import os
import zipfile

import boto3


class Uploader:
    def __init__(self, bucket_name=os.environ.get("BUCKET_NAME"),
                 lambda_bucket_name=os.environ.get("LAMBDA_BUCKET_NAME")):
        self.lambda_bucket_name = lambda_bucket_name
        self.bucket_name = bucket_name

        session = boto3.session.Session()
        self.s3 = session.client(
            service_name='s3',
            endpoint_url='https://storage.yandexcloud.net'
        )
        """ :type : pyboto3.s3 """

    def add_page(self, page_name: str, page_body: str, storage_class='STANDARD'):
        self.s3.put_object(Bucket=self.bucket_name, Key=page_name, Body=page_body, StorageClass=storage_class)

    @staticmethod
    def zip_lambdas():
        with zipfile.ZipFile('../main.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file in glob.glob('../functions/*') + glob.glob('../common/*') + glob.glob('../sms/*'):
                if '__pycache__' in file:
                    continue

                print(f'Added {file}')
                zipf.write(file, arcname=file[3:])
