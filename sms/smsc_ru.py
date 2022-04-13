# Integration for smsc.ru

import datetime
import os

import requests

SMS_API_LOGIN = os.environ.get('SMS_API_LOGIN')
SMS_API_PASSWORD = os.environ.get('SMS_API_PASSWORD')


def send_sms(phone: str, text: str, ttl: datetime.timedelta, ip: str):
    expiration = (datetime.datetime.now() + ttl).strftime('%H:%M')
    if expiration == '00:00':
        expiration = '24:00'

    requests.get(
        f'https://smsc.ru/sys/send.php?login={SMS_API_LOGIN}&psw={SMS_API_PASSWORD}&phones={phone}&mes={text}&valid={expiration}&userip={ip}')
