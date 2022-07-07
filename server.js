const express = require('express')
const index = require('./index')
const bodyParser = require('body-parser')

const app = express()
app.use(require('cors')())
app.use(bodyParser.text({type:"*/*"}))

const port = 3000;

function makeEvent(path, method, req) {
    return {
        path: path,
        isBase64Encoded: false,
        body: req.body,

        headers: {
            Authorization: req.get("Authorization")
        },
        params: {...req.query, ...req.params},
        requestContext: {
            identity: {
                sourceIp: "127.0.0.1",
                userAgent: req.headers["user-agent"]
            },
            apiGateway: {
                operationContext: {
                    method: method
                }
            }
        }
    }
}

function apply(result, res) {
    Object.keys(result.headers ?? {}).forEach(value => {
        res.setHeader(value, result.headers[value]);
    });
    res.status(result.statusCode)
    res.send(result.body)
}

app.post('/v1', async (req, res) => {
    apply(await index.handler(makeEvent("/v1", "", req)), res)
})

app.post('/login', async (req, res) => {
    apply(await index.handler(makeEvent("/login", "login", req)), res);
})

app.post('/send-code', async (req, res) => {
    apply(await index.handler(makeEvent("/send-code", "sendCode", req)), res);
})

app.post('/order', async (req, res) => {
    apply(await index.handler(makeEvent("/order", "order", req)), res);
})

app.get('/order/:id', async (req, res) => {
    apply(await index.handler(makeEvent(`/order/${req.params.id}`, "getOrder", req)), res);
})

app.post('/notifications/enable', async (req, res) => {
    apply(await index.handler(makeEvent(`/notifications/enable`, "enableNotifications", req)), res);
})

app.post('/notifications/disable', async (req, res) => {
    apply(await index.handler(makeEvent(`/notifications/disable`, "disableNotifications", req)), res);
})

app.get('/notifications/status/:token', async (req, res) => {
    apply(await index.handler(makeEvent(`/notifications/status/${req.params.token}`, "statusNotifications", req)), res);
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})