export type Method = (request: Request) => ApiResponse | Promise<ApiResponse>;

export type Request = {
    path: string,
    body: string,
    params: { [key: string]: string }
    headers: Headers,
    identity: Identity
}

export interface ApiResponse {
    statusCode: number,
    body?: string
}

export type Headers = { [key: string]: string }
export type Identity = {
    sourceIp: string,
    userAgent: string,
}

export type Api = { [key: string]: Method };
