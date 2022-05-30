const {requestContext} = require("./config.js");

async function wrapper() {
    return await require('../index').handler({
        isBase64Encoded: false,
        requestContext: requestContext,
        body: JSON.stringify(
            [
                {
                    "jsonrpc": "2.0",
                    "id": 0,
                    "method": "verify",
                    "params": {
                        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjkyZmJmOTIxZTM4YWU3MGMyZGU2M2M1YzVmYjAzZDQyIiwicGhvbmUiOiIrNyIsImlhdCI6MTY1MzczODExNn0.aUmjGLu1n83zQqRpRlclQrVa8cIfG2OLTkIUYAi8beQ"
                    }
                },
                {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "get_order",
                    params: {
                        orderID: "e6aabd95e7978e90f17b8979dfd29416"
                    }
                }])
    }, null)
}

wrapper().then(r => {
    console.log(r)
    process.exit()
})
