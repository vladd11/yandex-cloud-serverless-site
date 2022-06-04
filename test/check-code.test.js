const {requestContext} = require("./config.js");
const {jwtToken} = require("./config");

async function wrapper() {
    return await require("../index").handler({
        requestContext: requestContext,
        body: JSON.stringify([
            {
                "jsonrpc": "2.0",
                "id": "0",
                "method": "verify",
                "params": {
                    "token": jwtToken
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