# Interface of SMS scripts
import datetime


def send_sms(self, phone: str, text: str, ttl: datetime.timedelta, ip: str):
    raise NotImplementedError()
