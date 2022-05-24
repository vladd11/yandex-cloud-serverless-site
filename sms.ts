/**
 * SMSC.ru module
 */

import * as http from "http";

const SMS_API_LOGIN = process.env.SMS_API_LOGIN;
const SMS_API_PASSWORD = process.env.SMS_API_PASSWORD;

export default function sendSMS(phone: string, text: string, ip: string) {
    http.get(`https://smsc.ru/sys/send.php?login=${SMS_API_LOGIN}&psw=${SMS_API_PASSWORD}&phones=${phone}&mes=${text}&userip=${ip}`,
        {})
}