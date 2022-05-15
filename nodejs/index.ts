import {Auth} from "./auth"
import {Driver, getCredentialsFromEnv} from "ydb-sdk";

import Queries from "./queries";
import Event from "./types/Event";


const authService = getCredentialsFromEnv();
const driver = new Driver({
    endpoint: process.env.ENDPOINT || "grpcs://ydb.serverless.yandexcloud.net:2135",
    database: process.env.DATABASE,
    authService: authService
});

const queries = new Queries();

let isReady = false;

async function connect() {
    const timeout = 10000;
    if (!await driver.ready(timeout)) {
        console.error(`Driver has not become ready in ${timeout}ms!`);
        process.exit(1);
    }
    isReady = true
}

module.exports.handler = async function (event: Event, context) {
    if(!isReady) await connect();

    if(event.isBase64Encoded) {
        event.body = Buffer.from(event.body, "base64").toString('utf8')
    }

    return {
        statusCode: 200,
        body: JSON.stringify(Auth.login(driver.tableClient, queries, "", false, event.requestContext.identity))
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