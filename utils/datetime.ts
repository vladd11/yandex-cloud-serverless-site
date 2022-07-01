export const SMS_CODE_EXPIRATION_TIME = parseInt(process.env.SMS_CODE_EXPIRATION_TIME ?? "600")

export function getCurrentDatetime(): number {
    return Date.now() / 1000 | 0
}

export function getExpirationDatetime(): number {
    return getCurrentDatetime() + SMS_CODE_EXPIRATION_TIME
}
