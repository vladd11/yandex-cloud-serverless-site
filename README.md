# Serverless E-commerce site

This repository contains code of cloud function (back-end of the site).
If you want to check front-end of site, go to [gatsby-material-e-commerce repo](https://github.com/vladd11/gatsby-material-e-commerce).

This site is based on Yandex Cloud Functions + Cloudflare Pages (may be replaced with Yandex Object Storage static site feature).

### Installation:

- Create account on [Yandex Cloud](https://cloud.yanex.ru)
- [Create new database in Yandex Database service](https://cloud.yandex.com/en-ru/docs/ydb/getting_started/create_db)
- [Add new service account](https://cloud.yandex.com/en-ru/docs/iam/operations/sa/create) with ydb.viewer, ydb.editor roles.
- 

### Optional environment variables:
- SMS_VERIFICATION_ENABLED.
- SMS_CODE_LENGTH. Default: 6 digits.
- SMS_CODE_EXPIRATION_TIME (in seconds). Default: 10 minutes.
- SMS_CLASS. Custom SMS service provider script. Default is SMSC.ru

#### Special SMSC.ru provider environment variables:
- SMS_API_LOGIN
- SMS_API_PASSWORD