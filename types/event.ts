export default interface Event {
    requestContext: {
        identity: {
            sourceIp: string,
            userAgent: string
        }
    },
    body: string,
    isBase64Encoded: boolean
}