const {requestContext} = require("./config.js");
const {jwtToken} = require("./config");

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
                        token: jwtToken
                    }
                },
                {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "get_order",
                    params: {
                        orderID: "77623452a6b5030c55a8a247094c76d8"
                    }
                }])
    }, null)
}

wrapper().then(r => {
    console.log(r)
    process.exit()
})
