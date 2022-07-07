import {verify} from "jsonwebtoken";
import {SECRET_KEY} from "./auth";

export default function verifyAuthHeader(value?: string): {
    id: Buffer,
    phone: string
} | undefined {
    if(value?.startsWith("Bearer")) {
        try {
            let payload: any = verify(value.substring(7, value.length), SECRET_KEY)
            if (typeof payload === "string") payload = JSON.parse(payload)

            return {
                id: Buffer.from(payload.id, "hex"),
                phone: payload.phone
            }
        } catch (e) {
            console.error(e)
            return undefined;
        }
    } else return undefined
}
