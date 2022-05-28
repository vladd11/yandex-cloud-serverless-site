const {requestContext} = require("./config.js");

async function wrapper() {
    return await require("../index").handler({
        requestContext: requestContext,
        body: JSON.stringify([
            {
                "jsonrpc": "2.0",
                "id": "0",
                "method": "verify",
                "params": {
                    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjkyZmJmOTIxZTM4YWU3MGMyZGU2M2M1YzVmYjAzZDQyIiwicGhvbmUiOiIrNyIsImlhdCI6MTY1MzczODExNn0.aUmjGLu1n83zQqRpRlclQrVa8cIfG2OLTkIUYAi8beQ"
                }
            },
            {
                "jsonrpc": "2.0",
                "id": "1",
                "method": "add_order",
                "params": {
                    "products": [
                        {
                            "id": "01d00b1fd41a4719899156003959b3dd",
                            "count": 1
                        }
                    ],
                    "paymentMethod": "",
                    "address": "cash"
                }
            }
        ]),
        isBase64Encoded: false
    }, {});
}

wrapper().then(value => {
    console.log(value)
    process.exit()
})