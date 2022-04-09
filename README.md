# Serverless E-commerce site

### Installation:

- Create account on [Yandex Cloud](https://cloud.yanex.ru)
- Create new database in Yandex Database service
- Set ENDPOINT enviroment variable to grpcs://ydb.serverless.yandexcloud.net:2135, then set DATABASE var to YDB
  database.
- Download and install [Yandex Cloud CLI](https://cloud.yandex.com/en-ru/docs/cli/quickstart).
- Add new service account, give it storage.viewer, storage.uploader, ydb.viewer, ydb.editor roles.
- In CLI run:

      yc iam key create --folder-id keys --service-account-name [YOUR_SERVICE_ACCOUNT_NAME] --output ~/.ydb/sa_name.json

- Then set YDB_SERVICE_ACCOUNT_KEY_FILE_CREDENTIALS environment variable to service account path.
- Add new bucket, set BUCKET_NAME environment variable
- [Setup boto3 library](https://cloud.yandex.com/en-ru/docs/storage/tools/boto) **on same service account**
- Run
          
      pip install -r requirements.txt
- Run main.py

      python main.py deploy