import glob
import json
import os
import random
import subprocess
import zipfile
from json import JSONDecodeError

import boto3


class Uploader:
    def __init__(self, bucket_name=os.environ.get("BUCKET_NAME"),
                 lambda_bucket_name=os.environ.get("LAMBDA_BUCKET_NAME"), setup_file_path='setup.json'):
        self.setup_file_path = setup_file_path
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

    def deploy_lambdas(self):
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
            function_id, secret_key = self.install_function_if_needed()

            print(subprocess.check_output(
                f'yc serverless function version create --function-id {function_id} --source-path main.zip ' +
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
            return function_id

    def install_function_if_needed(self):
        if not os.path.exists('setup.json'):
            return self.install_function()
        else:
            return self.read_function()

    def install_function(self):
        with open(self.setup_file_path, 'w') as descriptor:
            file = {}

            output = subprocess.check_output('yc serverless function create', shell=True)
            function_id = output[4:24].decode('utf-8')
            file['function_id'] = function_id

            import string
            secret_key = ''.join(
                random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(32))
            file['secret_key'] = secret_key

            json.dump(file, descriptor)
            return function_id, secret_key

    def read_function(self):
        file_descriptor = open(self.setup_file_path, 'r')

        try:
            file = json.load(file_descriptor)

            function_id, secret_key = file['function_id'], file['secret_key']
            file_descriptor.close()

            return function_id, secret_key
        except (KeyError, JSONDecodeError):
            file_descriptor.close()
            return self.install_function()
