/**
 * This function converts type Long | number to number.
 */
import Long from "long";

export default function priceToNumber(number: Long.Long | number): number {
    if (typeof number !== "number") {
        const result = number?.divide(100).toNumber()
        if (result >= Number.MAX_SAFE_INTEGER) {
            throw new PriceIsTooBigException(result)
        }

        return result
    }
    return number / 100
}

class PriceIsTooBigException extends Error {
    constructor(number: number) {
        super(`Number (${number}) is bigger than MAX_SAFE_INTEGER. This may cause bugs on some users`);
    }
}
