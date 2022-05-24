const {requestContext} = require("./config.js");

async function wrapper() {
    return await require("../index").handler({
        requestContext: requestContext,
        body: JSON.stringify({
            "jsonrpc": "2.0",
            "id": 0,
            "method": "check_code",
            "params": {
                "phone": "+71",
                code: 852786
            },
        }),
        isBase64Encoded: false
    }, {});
}

wrapper().then(value => {
    console.log(value)
    process.exit()
})