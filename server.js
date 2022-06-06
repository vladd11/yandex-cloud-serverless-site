const express = require('express')
const index = require('./index')
const bodyParser = require('body-parser')

const app = express()
app.use(require('cors')())
app.use(bodyParser.text())

const port = 3000

app.post('/v1', async (req, res) => {
    const result = await index.handler({
        isBase64Encoded: false,
        body: req.body,
        requestContext: {
            identity: {
                sourceIp: "127.0.0.1",
                userAgent: req.headers["user-agent"]
            }
        }
    });
    res.send(result.body)
})

app.post('/login', async (req, res) => {
    res.send("test")
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})