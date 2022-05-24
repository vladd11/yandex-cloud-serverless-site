import {Auth} from "./auth"
import {Driver, getCredentialsFromEnv} from "ydb-sdk";

import Queries from "./queries";

import Event from "./types/event";
import Dispatcher from "./rpc";


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

const dispatchers = new Dispatcher({
    login: auth.login.bind(auth),
    send_code: auth.sendCode.bind(auth),
    check_code: auth.checkCode.bind(auth)
})

// Due to ctx argument
// noinspection JSUnusedLocalSymbols
module.exports.handler = async function (event: Event, ctx) {
    if (!isReady) await connect();

    if (event.isBase64Encoded) {
        event.body = Buffer.from(event.body, "base64").toString('utf8')
    }

    return {
        statusCode: 200,
        body: await dispatchers.call(event.body, event.requestContext.identity)
    }
}
