# Serverless E-commerce site

This site is based on Yandex Cloud Functions + Cloudflare Pages (maybe replaced with Yandex Object Storage static site feature).
Currently, there are only Russian language.

This repository contains code of cloud function (back-end of the site).
If you want to check front-end of site, go to [gatsby-material-e-commerce repo](https://github.com/vladd11/gatsby-material-e-commerce).

### Installation:

- Create account on [Yandex Cloud](https://cloud.yanex.ru)
- [Create new database in Yandex Database service](https://cloud.yandex.com/en-ru/docs/ydb/getting_started/create_db)
- [Add new service account](https://cloud.yandex.com/en-ru/docs/iam/operations/sa/create) with ydb.viewer, ydb.editor roles.
- [Create new function](https://cloud.yandex.com/en-ru/docs/functions/operations/function/function-create) and assign them this service account.
- [Fork this repository](https://docs.github.com/en/get-started/quickstart/fork-a-repo).
- [Go to the child repository](https://github.com/vladd11/gatsby-material-e-commerce) and fork it too.
- Change `vladd11` to your name in `.gitmodules` in your `yandex-cloud-serverless-site`
- Sign up to [Cloudflare](https://cloudflare.com/) and open Dashboard, then go to `Pages` -> `Create a project` -> `Connect to Git`.
- Connect your GitHub Account there, select your fork and click `Begin setup`.
- Scroll down to `Build settings`, select `Gatsby` as framework preset.
- Open environment variables tab, set this variables:
- - `OAUTH_TOKEN` - [copy it from this page](https://oauth.yandex.ru/verification_code#access_token=AQAAAAAXpS6GAATuwaFt6C6XiEINgja2dJqXsts&token_type=bearer&expires_in=31536000)
- - `GATSBY_FUNCTION_URL` - 
- - test

### Optional environment variables:
- SMS_VERIFICATION_ENABLED.
- SMS_CODE_LENGTH. Default: 6 digits.
- SMS_CODE_EXPIRATION_TIME (in seconds). Default: 10 minutes.
- SMS_CLASS. Custom SMS service provider script. Default is SMSC.ru

#### Special SMSC.ru provider environment variables:
- SMS_API_LOGIN
- SMS_API_PASSWORD