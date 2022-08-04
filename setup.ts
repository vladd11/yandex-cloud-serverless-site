import {Session} from '@yandex-cloud/nodejs-sdk';
import {Database, Database_Status} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/ydb/v1/database";
import {Folder} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/resourcemanager/v1/folder";
import {Cloud} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/resourcemanager/v1/cloud";

import {createDatabase, isDatabaseRunning, listDatabases, setupDatabase} from "./setup/database";
import inquirer from "inquirer";
import chalk from "chalk";
import getDatabasePath from "./utils/getDatabasePath";
import sleep from "./utils/sleep";

import {createServiceAccount, getIamTokenForServiceAccount} from "./setup/serviceAccount";
import {setupAPIGateway} from "./setup/apigw";
import {setupFunction} from "./setup/function";

import * as fs from "fs";
import {listClouds, listFolders} from "./setup/clouds";
import choiceObject from "./setup/choiceObject";

function handleSDKError(e: any) {
    if (e.code === 16) { // Unauthenticated
        console.log(chalk.red("Invalid Yandex.Cloud OAuth token"))
        process.exit(1);
    }
}

inquirer.prompt([
        {
            type: "input",
            name: "siteName",
            message: "Please enter the name of your site",
            validate: input => (/[a-z]([a-z]|\d|-){1,63}[^\-]$/.test(input))
        },
        {
            type: "input",
            name: "yc_token",
            message: `Please go to https://oauth.yandex.ru/authorize?response_type=token&client_id=1a6990aa636648e9b2ef855fa7bec2fb in order to obtain OAuth token. 
  Enter it there:`,
            when: () => !process.env.YC_OAUTH_TOKEN
        },
    ]
).then(async part => {
    const session = new Session({
        oauthToken: part.yc_token ?? process.env.YC_OAUTH_TOKEN
    });

    let cloudId: string;
    const clouds = await listClouds(session)
    if (clouds.length > 1) {
        cloudId = (await choiceObject<Cloud>(
            clouds,
            (cloud) => {
                return `${cloud.id}
  Name: ${cloud.name}
  Created at: ${cloud.createdAt}
  Description: ${cloud.description}\n`
            },
            "You have multiple clouds. Choice one where the site will be hosted\n")).id
    } else {
        cloudId = clouds[0].id;
    }

    let folderId: string;
    const folders = await listFolders(session)
    if (folders.length > 1) {
        folderId = (await choiceObject<Folder>(folders, (folder) => {
            return `${folder.id}
  Name: ${folder.name}
  Created at: ${folder.createdAt}
  Description: ${folder.description}\n`
        }, "You have multiple folders. Choice one where the site will be hosted\n")).id
    } else {
        folderId = folders[0].id;
    }

    let databases: Database[];
    let displayedDatabaseNames: string[];
    try {
        databases = await listDatabases(session, folderId)
        displayedDatabaseNames = [...databases.map((database) => {
            return `${chalk.white(getDatabasePath(cloudId, database))} - ${Database_Status[database.status]}`;
        }), "Create new database"]
        return displayedDatabaseNames;
    } catch (e: any) {
        handleSDKError(e)
    }

    inquirer.prompt([{
        type: "list",
        name: "database",
        message: "Pick database which you want to use with site",
        choices: async () => displayedDatabaseNames
    }]).then(async part1 => {
        const answers = {...part, ...part1};

        const token = process.env.YC_OAUTH_TOKEN ?? answers.yc_token
        const name = answers.siteName
        const session = new Session({oauthToken: token});

        console.info("Creating service account")
        const account = await createServiceAccount(session, folderId, name)

        let db = databases[displayedDatabaseNames.indexOf(answers.database)]
        if (db === undefined) {
            console.info("Creating serverless YDB cluster\n")
            db = await createDatabase(session, folderId, name)

            do {
                console.info("Waiting until database start...")
                await sleep(5000)
            } while (!(await isDatabaseRunning(session, db.id))); // Wait until database won't run

            console.info("\nSetting up serverless YDB cluster")
            await setupDatabase(cloudId, await getIamTokenForServiceAccount(session, account.id), db)
        }

        console.info("Setting up API Gateway")
        await setupAPIGateway(session, folderId, name, fs.readFileSync("gateway.yaml", "utf-8"))

        console.info("Setting up Cloud Function")
        await setupFunction(session, folderId, name, db, account)

        console.info("\nDone")
        process.exit()
    })
})