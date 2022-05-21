export class JSONRPCError extends Error {
    public readonly code: any;
    public readonly message: any;

    constructor(message, code) {
        super(message);
        this.code = code;
        this.message = message;
    }

    public toObject() {
        return {
            code: this.code,
            message: this.message
        }
    }
}

export class ParseError extends JSONRPCError {
    constructor() {
        super("Parse error", -32700);
    }
}

export class MethodNotFound extends JSONRPCError {
    constructor() {
        super("Method not found", -32601);
    }
}