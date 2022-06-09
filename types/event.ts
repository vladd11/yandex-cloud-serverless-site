export default interface Event {
    requestContext: {
        identity: {
            sourceIp: string,
            userAgent: string
        }
    },
    apiGateway: {
        operationContext: {
            method: string
        }
    },
    path: string,
    body: string,
    isBase64Encoded: boolean
}