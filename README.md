# Serverless E-commerce site

### Installation:

- Create account on [Yandex Cloud](https://cloud.yanex.ru)
- Create new database in Yandex Database service
- Set ENDPOINT enviroment variable to grpcs://ydb.serverless.yandexcloud.net:2135, then set DATABASE var to YDB
  database.
- Add new service account, give it ydb.viewer, ydb.editor roles.
- Download and install [Yandex Cloud CLI](https://cloud.yandex.com/en-ru/docs/cli/quickstart).
- Restart terminal, run

      yc init
      yc iam key create --folder-id keys --service-account-name [YOUR_SERVICE_ACCOUNT_NAME] --output ~/.ydb/sa_name.json

- Then set YDB_SERVICE_ACCOUNT_KEY_FILE_CREDENTIALS environment variable to service account path.
- Set SERVICE_ACCOUNT_ID to this service account ID.
- Fill database and info.json with your information.
- Run

      pip install -r requirements.txt
      python main.py deploy


### Optional environment variables:
- SMS_VERIFICATION_ENABLED.
- SMS_CODE_LENGTH. Default: 6 digits.
- SMS_CODE_EXPIRATION_TIME (in seconds). Default: 10 minutes.
- SMS_CLASS. Custom SMS service provider script. Default is SMSC.ru

#### Special SMSC.ru provider environment variables:
- SMS_API_LOGIN
- SMS_API_PASSWORD