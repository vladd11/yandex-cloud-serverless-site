/**
 * SMSC.ru module
 */

import * as https from "https";
import config from "./config";

const SMS_API_LOGIN = process.env.SMS_API_LOGIN;
const SMS_API_PASSWORD = process.env.SMS_API_PASSWORD;

export default function sendSMS(phone: string, text: string, ip: string) {
    https.get(`https://smsc.ru/sys/send.php?login=${SMS_API_LOGIN}&psw=${SMS_API_PASSWORD}&phones=${phone}&mes=${text}&userip=${ip}`,
        {})
}

export function sendLoginSMS(phone: string, code: number, ip: string) {
    const text = `${config.shopSmsName}: ${code} ваш SMS-код`
    https.get(`https://smsc.ru/sys/send.php?login=${SMS_API_LOGIN}&psw=${SMS_API_PASSWORD}&phones=${phone}&mes=${text}&userip=${ip}`,
        {})
}