const {requestContext, jwtToken} = require("./config");

async function wrapper() {
    return await require('../index').handler({
        isBase64Encoded: false,
        requestContext: requestContext,
        body: JSON.stringify(
            [
                {
                    "jsonrpc": "2.0",
                    "method": "verify",
                    "params": {
                        "token": jwtToken
                    }
                },
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "add_order",
                    "params": {
                        "products": [
                            {
                                "id": "a32dd0830dd04c43a026da8e1c04ebb4",
                                "count": 1
                            }
                        ],
                        "paymentMethod": "cash",
                        "address": "",
                        "phone": "+71234567890",
                        "time": 1656940080
                    }
                }
            ])
    })
}

wrapper().then(r => {
    console.log(r)
    process.exit()
})
