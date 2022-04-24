import glob
import json
import os
import random
import subprocess
import zipfile
from json import JSONDecodeError

import transliterate
from jinja2 import Environment


class Uploader:
    def __init__(self, env: Environment, setup_file_path='setup.json'):
        self.env = env
        self.setup_file_path = setup_file_path

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

    def deploy_pages(self, products, categories, info, function_id):
        for path in glob.glob('templates/*.*'):
            path = os.path.basename(path)

            # Check that file doesn't have sub-extensions. It's need to prevent uploading of base template files
            page = self.env.get_template(str(path)).render(products=products,
                                                           categories=categories,
                                                           info=info,
                                                           theme=info['theme'],
                                                           function_id=function_id)
            with open(f'site-deploy/{path}', 'w') as f:
                f.write(page)

            print(f'Deployed: {path}')

        for product in products:
            page = self.env.get_template('repeating/product.html').render(product=product, info=info, title=product.title)
            path = f'site-deploy/{transliterate.translit(product.title, "ru", reversed=True).replace(" ", "_")}.html'

            with open(path, 'w') as f:
                f.write(page)
            print(f'Deployed: {path}')
