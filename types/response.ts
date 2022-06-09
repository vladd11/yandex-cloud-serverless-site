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

export interface ApiResponse {
    statusCode: number,
    body?: string
}
