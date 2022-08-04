import {serviceClients, Session, waitForOperation} from "@yandex-cloud/nodejs-sdk";
import build from "../build";
import {
    CreateFunctionRequest,
    CreateFunctionVersionRequest
} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/serverless/functions/v1/function_service";
import {Database} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/ydb/v1/database";
import {Duration} from "@yandex-cloud/nodejs-sdk/dist/generated/google/protobuf/duration";
import {Function} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/serverless/functions/v1/function";
import {ServiceAccount} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/iam/v1/service_account";

import archiver from "archiver";
import * as fs from "fs";
import {randomBytes, randomInt} from "crypto";

export async function setupFunction(session: Session, folderId: string, name: string, database: Database, account: ServiceAccount) {
    build()

    const client = session.client(serviceClients.FunctionServiceClient)
    const func = Function.decode((await waitForOperation(await client.create(CreateFunctionRequest.fromPartial({
        folderId: folderId,
        name: name,
    })), session)).response!.value)

    const output = fs.createWriteStream("./build.zip");
    const archive = archiver("zip")
    archive.pipe(output);

    archive.append(fs.createReadStream("./build/index.js"), {name: "index.js"})
    archive.append(fs.createReadStream("./build/package.json"), {name: "package.json"})
    archive.append(fs.createReadStream("./build/package-lock.json"), {name: "package-lock.json"})

    await archive.finalize()
    output.close()

    const secret = randomBytes(randomInt(32, 56)).toString("base64")

    client.createVersion(CreateFunctionVersionRequest.fromPartial({
        functionId: func.id,
        content: fs.readFileSync("./build.zip"),

        entrypoint: "index.handler",
        environment: {
            "ENDPOINT": "grpcs://ydb.serverless.yandexcloud.net:2135",
            "DATABASE": `${database.locationId}/${database.folderId}/${database.id}`,
            "SECRET_KEY": secret
        },
        resources: {
            memory: 128 * 1024 * 1024
        },
        tag: ["latest"],
        namedServiceAccounts: {},
        secrets: [],
        runtime: "nodejs16",
        serviceAccountId: account.id,
        executionTimeout: Duration.fromPartial({seconds: 3})
    }))
}