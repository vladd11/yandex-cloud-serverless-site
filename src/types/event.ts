export default interface Event {
    requestContext: {
        identity: {
            sourceIp: string,
            userAgent: string
        },
        apiGateway: {
            operationContext: {
                method: string,
            }
        }
    },
    headers: { [key: string]: string },
    params: { [key: string]: string },
    path: string,
    body: string,
    isBase64Encoded: boolean
}