const {requestContext} = require("./config");

async function wrapper() {
    return await require('../index').handler({
        isBase64Encoded: false,
        requestContext: requestContext,
        body: JSON.stringify(
            [
                {
                    "jsonrpc": "2.0",
                    "id": 0,
                    "method": "login",
                    "params": {
                        "phone": "+712343",
                        "verify": false
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
