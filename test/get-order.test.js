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
                        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImE1MDJhNzVhNzZjNjI3Mjc1OThlYzRiMmVmODk2MWYxIiwicGhvbmUiOiIrNzEyMzQ1Njc4OTAiLCJpYXQiOjE2NTQzMzY2MDF9.bzozI4iggxk1ij3idPWICqNAq9COiVfJH2PIJoWynNE"
                    }
                },
                {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "get_order",
                    params: {
                        orderID: "ec704d73eb7ba2cf3d4121e8357cd75a"
                    }
                }])
    }, null)
}

wrapper().then(r => {
    console.log(r)
    process.exit()
})
