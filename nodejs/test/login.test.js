const {requestContext} = require("./config.js");

async function wrapper() {
    return await require('../index').handler({
        isBase64Encoded: false,
        requestContext: requestContext,
        body: JSON.stringify(
            {
                "jsonrpc": "2.0",
                "id": 0,
                "method": "login",
                "params": {
                    "phone": "+79170324874",
                    "verify": false
                }
            })
    }, null)
}

wrapper().then(r => {
    console.log(r)
    process.exit()
})
