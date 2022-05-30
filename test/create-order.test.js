const {requestContext} = require("./config");

async function wrapper() {
    return await require('../build/index').handler({
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
                    "jsonrpc": "2.0",
                    "id": 0,
                    "method": "add_order",
                    "params": {
                        products: [
                            {
                                id: "01aad20e78a44bb3a05717eb9895dfa6",
                                count: 1
                            }
                        ]
                    }
                }
            ])
    })
}

wrapper().then(r => {
    console.log(r)
    process.exit()
})
