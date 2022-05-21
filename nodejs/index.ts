import {Auth} from "./auth"
import {Driver, getCredentialsFromEnv} from "ydb-sdk";

import Queries from "./queries";

import Event from "./types/Event";
import Response from "./types/Response";

import {JSONRPCError, ParseError} from "./exceptions";
import {BaseContext} from "./context";


const authService = getCredentialsFromEnv();
const driver = new Driver({
    endpoint: process.env.ENDPOINT || "grpcs://ydb.serverless.yandexcloud.net:2135",
    database: process.env.DATABASE,
    authService: authService
});

let isReady = false;

async function connect() {
    const timeout = 10000;
    if (!await driver.ready(timeout)) {
        console.error(`Driver has not become ready in ${timeout}ms!`);
        process.exit(1);
    }
    isReady = true
}

const queries = new Queries();
const auth = new Auth(driver.tableClient, queries)

const dispatchers = {
    login: auth.login,
    send_code: auth.send_code
}

// Due to ctx argument
// noinspection JSUnusedLocalSymbols
module.exports.handler = async function (event: Event, ctx) {
    if (!isReady) await connect();

    if (event.isBase64Encoded) {
        event.body = Buffer.from(event.body, "base64").toString('utf8')
    }

    try {
        const context : BaseContext = event.requestContext.identity

        const requests = [].concat(JSON.parse(event.body))

        if (requests.length !== 0) {
            const responses: Array<Response> = [];

            for (const request of requests) {
                try {
                    responses.push({
                        jsonrpc: "2.0",
                        id: request.id,
                        result: dispatchers[request.method](request.params, context)
                    })
                } catch (e) {
                    const error = (e instanceof JSONRPCError) ? e.toObject() : {
                        code: -32000,
                        message: (typeof e === "object") ? e.message : e,
                    }

                    responses.push({
                        jsonrpc: "2.0",
                        id: request.id,
                        error: error
                    })
                }
            }

            return {
                code: 200,
                body: JSON.stringify(responses)
            }
        }
    } catch (e) {
        if (e instanceof SyntaxError) {
            e = new ParseError().toObject();
        }

        return {
            statusCode: 200,
            body: {
                "jsonrpc": "2.0",
                "error": e,
                "id": null
            }
        }
    }
}

/*
async function run() {
    await connect();
    /*await driver.tableClient.withSession(async (session) => {
        const result = await session.executeQuery(`
        SELECT * FROM orders
        LIMIT 10;
        `)
        console.log(result)
    })*//*

const queries = new Queries();

await Auth.login(driver.tableClient, queries, "+79170324874", false, {
    sourceIp: "",
    userAgent: ""
})
}

/*
const context: Auth.AuthorizedContext = {
    sourceIp: "",
    userAgent: "",
    user_uid: uuidv4()
}

Auth.login("", context)
console.log(context)*/