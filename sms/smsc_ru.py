# Integration for smsc.ru

import os

import requests

SMS_API_LOGIN = os.environ.get('SMS_API_LOGIN')
SMS_API_PASSWORD = os.environ.get('SMS_API_PASSWORD')


def send_sms(phone: str, text: str, ip: str):
    requests.get(
        f'https://smsc.ru/sys/send.php?login={SMS_API_LOGIN}&psw={SMS_API_PASSWORD}&phones={phone}&mes={text}&userip={ip}')
