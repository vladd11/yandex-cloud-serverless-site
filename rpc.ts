import {JSONRPCError, MethodNotFound, ParseError} from "./exceptions";
import {BaseContext} from "./types/context";
import Response from "./types/response";
import {JSONRPCRequest} from "./gatsby-material-e-commerce/src/api/client";

type JSONRPCFunction = (params: {
    [key: string]: any
}, context: BaseContext) => any;

/**
 * This is class that invokes *async* methods by JSON-RPC request
 * It passes params as object, so function can be invoked when client doesn't provide all/any arguments.
 *
 * Using JSON-RPC was a mistake because it's more complicated than REST API both on server and client side.
 * But it makes function execution 2 times cheaper because Yandex Cloud Functions rounding execution time to 100ms,
 * and it will be +1 HTTP call.
 */
export default class LegacyDispatcher {
    private readonly _dispatchers: { [key: string]: JSONRPCFunction };

    constructor(dispatchers: { [key: string]: JSONRPCFunction }) {
        this._dispatchers = dispatchers;
    }


    async call(request: string, context: BaseContext) {
        try {
            const requests: Array<JSONRPCRequest> = [].concat(JSON.parse(request))

            if (requests.length !== 0) {
                let responses: Array<Response> | Response = [];

                for (const request of requests) {
                    try {
                        const method = this._dispatchers[request.method]
                        if (method) {
                            responses.push({
                                jsonrpc: "2.0",
                                id: request.id,
                                result: await method(request.params, context)
                            })
                        } else {
                            responses.push(LegacyDispatcher._error(new MethodNotFound().toObject(), request.id))
                        }
                    } catch (e) {
                        let error;
                        if (e instanceof JSONRPCError) {
                            error = e.toObject()
                        } else {
                            error = {
                                code: -32000,
                                message: (e instanceof Error) ? e.message : e,
                            };
                            console.error(e)
                        }

                        responses.push(LegacyDispatcher._error(error, request.id))
                    }
                }

                return JSON.stringify(
                    (responses.length === 1)
                        ? responses[0]
                        : responses)
            }
        } catch (e) {
            if (e instanceof SyntaxError) {
                e = new ParseError().toObject();
            }

            return LegacyDispatcher._error(e)
        }
    }

    private static _error(error: any, id?: any) {
        return {
            "jsonrpc": "2.0",
            "error": error,
            "id": id
        }
    }
}

export function loggable(methodName: string, context: BaseContext) {
    console.log(`${methodName} was called from ${context.sourceIp} ${context.userAgent}`)
}
