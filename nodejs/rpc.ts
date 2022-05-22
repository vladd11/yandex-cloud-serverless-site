import {JSONRPCError, MethodNotFound, ParseError} from "./exceptions";
import {BaseContext} from "./types/context";
import Response from "./types/response";

type JSONRPCFunction = (params: {
    [key: string]: any
}, context: BaseContext) => any;

export default class Dispatcher {
    private readonly _dispatchers: { [key: string]: JSONRPCFunction };

    constructor(dispatchers: { [key: string]: JSONRPCFunction }) {
        this._dispatchers = dispatchers;
    }


    call(request: string, context: BaseContext) {
        try {
            const requests = [].concat(JSON.parse(request))

            if (requests.length !== 0) {
                let responses: Array<Response> | Response = [];

                for (const request of requests) {
                    try {
                        const method = this._dispatchers[request.method]
                        if (method) {
                            responses.push({
                                jsonrpc: "2.0",
                                id: request.id,
                                result: method(request.params, context)
                            })
                        } else {
                            responses.push({
                                jsonrpc: "2.0",
                                id: request.id,
                                error: new MethodNotFound().toObject()
                            })
                        }
                    } catch (e) {
                        const error = (e instanceof JSONRPCError) ? e.toObject() : {
                            code: -32000,
                            message: (typeof e === "object") ? e.message : e,
                        }

                        responses.push({
                            jsonrpc: "2.0",
                            id: request.id,
                            error: error
                        })
                    }
                }

                if(responses.length === 1) {
                    responses = responses[0]
                }

                return JSON.stringify(responses)
            }
        } catch (e) {
            if (e instanceof SyntaxError) {
                e = new ParseError().toObject();
            }

            return {
                "jsonrpc": "2.0",
                "error": e,
                "id": null
            }
        }
    }
}