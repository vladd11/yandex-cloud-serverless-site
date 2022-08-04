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

export type Headers = {
    Authorization?: string,
    [key: string]: string | undefined,
}
export type Identity = {
    sourceIp: string,
    userAgent: string,
}

export type Api = { [key: string]: Method };
