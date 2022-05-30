/**
 * This function converts type Long | number to number.
 */
import Long from "long";

export default function longToNumber(number: Long | number) {
    if (typeof number !== "number") {
        return number?.toNumber()
    }
    return number
}