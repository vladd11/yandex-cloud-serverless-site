import {Driver, getCredentialsFromEnv} from "ydb-sdk";

import Event from "./types/event";
import Auth from "./auth/auth";
import {Api} from "./types/api";
import OrderManager from "./orders/order-manager";
import disableNotifications from "./notifications/disable/main";
import enableNotifications from "./notifications/enable/main";
import getNotificationStatus from "./notifications/status/main";
import cors from "../cors";

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

const methods: Api = {
    sendCode: (request) => Auth.sendCodeToLogin(driver.tableClient, request.body, request.headers, request.identity),
    login: (request) => Auth.login(driver.tableClient, request.body, request.identity),

    order: (request) => OrderManager.order(driver.tableClient, request.body, request.headers, request.identity),
    getOrder: (request) => {
        const path = request.path.split("/")
        return OrderManager.getOrder(driver.tableClient, {
            orderID: path[path.length - 1]
        }, request.headers)
    },
    resendCode: (request) => Auth.sendCodeToLogin(driver.tableClient, request.body, request.headers, request.identity),

    enableNotifications: (request) => enableNotifications(driver.tableClient, request.body, request.headers),
    disableNotifications: (request) => disableNotifications(driver.tableClient, request.headers),
    statusNotifications: (request) => getNotificationStatus(driver.tableClient, request.params.token, request.headers)
}

module.exports.handler = async function (event: Event) {
    if (!isReady) await connect();

    if (event.isBase64Encoded) {
        event.body = Buffer.from(event.body, "base64").toString('utf8')
    }

    const method = event.requestContext.apiGateway.operationContext.method;
    const identity = event.requestContext.identity;

    const result = await methods[method]?.({
        path: event.path,
        body: event.body,
        headers: event.headers,
        params: event.params,
        identity: identity
    });

    if (result) {
        return {
            statusCode: result.statusCode,
            body: result.body ?? "",
            headers: {
                "Content-Type": "application/json",
                ...cors
            }
        }
    } else {
        return {
            statusCode: 404,
            body: "",
            headers: cors
        }
    }
}
