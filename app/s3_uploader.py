import glob
import os
import subprocess
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
    def deploy_lambdas():
        with zipfile.ZipFile('main.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file in glob.glob('functions/*') + glob.glob('common/*') + glob.glob('sms/*'):
                if '__pycache__' in file:
                    continue

                if os.path.basename(file) == 'requirements.txt':
                    zipf.write(file, arcname=os.path.basename(file))
                else:
                    zipf.write(file, arcname=file)
                print(f'Added {file}')

        try:
            print(subprocess.check_output(
                f'yc serverless function version create --function-id {os.environ.get("FUNCTION_ID")} --source-path main.zip ' +
                f'--runtime python39 --entrypoint functions.main.handler ' +
                f'--service-account-id {os.environ.get("SERVICE_ACCOUNT_ID")} ' +
                f'--environment ENDPOINT={os.environ.get("ENDPOINT")} ' +
                f'--environment DATABASE={os.environ.get("DATABASE")} ' +
                f'--environment SECRET_KEY={os.environ.get("SECRET_KEY")} ',
                shell=True))
        except subprocess.CalledProcessError as e:
            print(f'\nNon-zero return code: {e.returncode}')
        else:
            print("Successfully deployed!")
