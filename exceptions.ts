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

export class NotEnoughArgsError extends JSONRPCError {
    constructor(argument: string) {
        super(`Argument ${argument} not provided`, -32602);
    }
}

export function requiredArgument(argument: string, value: any) {
    if(!value) throw new NotEnoughArgsError(argument)
}
