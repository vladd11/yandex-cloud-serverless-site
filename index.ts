import {LegacyAuth} from "./auth/legacyAuth";

import {Driver, getCredentialsFromEnv} from "ydb-sdk";

import Event from "./types/event";
import LegacyDispatcher from "./rpc";
import OrderManager from "./orders/order-manager";
import Auth from "./auth/auth";
import Methods from "./types/methods";


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

const auth = new LegacyAuth(driver.tableClient)
const orderManager = new OrderManager(driver.tableClient)

const legacyDispatcher = new LegacyDispatcher({
    verify: auth.verify.bind(auth),
    login: auth.login.bind(auth),
    send_code: auth.sendCode.bind(auth),
    check_code: auth.checkCode.bind(auth),
    add_order: orderManager.addOrder.bind(orderManager),
    get_order: orderManager.getOrder.bind(orderManager)
})

const methods : Methods = {
    sendCode: (body: string) => Auth.sendCode(driver.tableClient, body)
}

module.exports.handler = async function (event: Event) {
    if (!isReady) await connect();

    if (event.isBase64Encoded) {
        event.body = Buffer.from(event.body, "base64").toString('utf8')
    }

    if(event.path === "/v1") {
        return {
            statusCode: 200,
            body: await legacyDispatcher.call(event.body, event.requestContext.identity)
        }
    }

    return {
        statusCode: 200,
        body: await methods[event.requestContext.apiGateway.operationContext.method](event.body)
    }
}
