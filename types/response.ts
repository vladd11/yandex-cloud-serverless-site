export default interface Response {
    jsonrpc: string,
    result?: {
        [key: string]: any
    },
    error?: {
        code: number,
        message: string
    }
    id: any
}