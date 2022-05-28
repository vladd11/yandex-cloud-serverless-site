const {requestContext} = require("./config.js");

async function wrapper() {
    return await require("../index").handler({
        requestContext: requestContext,
        body: JSON.stringify([
            {
                "jsonrpc": "2.0",
                "id": 0,
                "method": "check_code",
                "params": {
                    "phone": "+7",
                    "code": 229760
                }
            },
            {
                "jsonrpc": "2.0",
                "id": "1",
                "method": "add_order",
                "params": {
                    "products": [
                        {
                            "id": "01aad20e78a44bb3a05717eb9895dfa6",
                            "count": 1
                        }
                    ],
                    "paymentMethod": "cash",
                    "address": ""
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