import {Auth} from "./auth";

import {Driver, getCredentialsFromEnv} from "ydb-sdk";

import Queries from "./queries";

import Event from "./types/event";
import Dispatcher from "./rpc";
import OrderManager from "./order-manager";


const authService = getCredentialsFromEnv();
const driver = new Driver({
    endpoint: process.env.ENDPOINT ?? "grpcs://ydb.serverless.yandexcloud.net:2135",
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
const orderManager = new OrderManager(driver.tableClient, queries)

const dispatcher = new Dispatcher({
    verify: auth.verify.bind(auth),
    login: auth.login.bind(auth),
    send_code: auth.sendCode.bind(auth),
    check_code: auth.checkCode.bind(auth),
    add_order: orderManager.addOrder.bind(orderManager),
    get_order: orderManager.getOrder.bind(orderManager)
})

module.exports.handler = async function (event: Event) {
    if (!isReady) await connect();

    if (event.isBase64Encoded) {
        event.body = Buffer.from(event.body, "base64").toString('utf8')
    }

    return {
        statusCode: 200,
        body: await dispatcher.call(event.body, event.requestContext.identity)
    }
}
