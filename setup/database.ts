import {cloudApi, Session} from "@yandex-cloud/nodejs-sdk";
import {Database, Database_Status} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/ydb/v1/database";
import {Column, Driver, TableDescription, TokenAuthService, Types} from "ydb-sdk";
import getDatabasePath from "../src/utils/getDatabasePath";

const databaseApi = cloudApi.ydb.database_service;

export async function listDatabases(session: Session, folderId: string): Promise<Database[]> {
    const databaseService = session.client(cloudApi.ydb.database_service.DatabaseServiceClient);
    return (await databaseService.list(databaseApi.ListDatabasesRequest.fromPartial({
        folderId: folderId
    }))).databases
}

export async function createDatabase(session: Session, folderId: string, name: string): Promise<Database> {
    const databaseService = session.client(cloudApi.ydb.database_service.DatabaseServiceClient);

    const result = await databaseService.create(databaseApi.CreateDatabaseRequest.fromPartial({
        folderId: folderId,
        name: name,
        serverlessDatabase: {}
    }));
    return Database.decode(result.response!.value)
}

export async function setupDatabase(cloudId: string, iamToken: string, database: Database) {
    const driver = new Driver({
        endpoint: "grpcs://ydb.serverless.yandexcloud.net:2135",
        database: getDatabasePath(cloudId, database),
        authService: new TokenAuthService(iamToken)
    });

    await driver.ready(5000)

    await driver.tableClient.withSession(async session => {
        await session.createTable("image_carousels",
            new TableDescription()
                .withColumn(new Column("id", Types.STRING))
                .withColumn(new Column("alt", Types.UTF8))
                .withColumn(new Column("image_uri", Types.UTF8))
                .withColumn(new Column("product_id", Types.STRING))
                .withPrimaryKey("id")
        )
        await session.createTable("notifications",
            new TableDescription()
                .withColumn(new Column("token", Types.STRING))
                .withColumn(new Column("user_id", Types.STRING))
                .withPrimaryKeys("token", "user_id")
        )
        await session.createTable("order_items",
            new TableDescription()
                .withColumn(new Column("id", Types.STRING))
                .withColumn(new Column("order_id", Types.STRING))
                .withColumn(new Column("price", Types.UINT64))
                .withColumn(new Column("product_id", Types.STRING))
                .withColumn(new Column("quantity", Types.UINT32))
                .withPrimaryKey("id")
        )
        await session.createTable("orders",
            new TableDescription()
                .withColumn(new Column("id", Types.STRING))
                .withColumn(new Column("hasPaid", Types.BOOL))
                .withColumn(new Column("isCompleted", Types.BOOL))
                .withColumn(new Column("from_time", Types.DATETIME))
                .withColumn(new Column("to_time", Types.DATETIME))
                .withColumn(new Column("payment_method", Types.UINT8))
                .withColumn(new Column("phone", Types.UINT8))
                .withColumn(new Column("price", Types.UINT64))
                .withColumn(new Column("user_id", Types.STRING))
                .withPrimaryKey("id")
        )
        await session.createTable("products",
            new TableDescription()
                .withColumn(new Column("id", Types.STRING))
                .withColumn(new Column("category", Types.UINT32))
                .withColumn(new Column("description", Types.UTF8))
                .withColumn(new Column("image_uri", Types.UTF8))
                .withColumn(new Column("price", Types.UINT64))
                .withColumn(new Column("title", Types.UTF8))
                .withPrimaryKey("id")
        )
        await session.createTable("users",
            new TableDescription()
                .withColumn(new Column("phone", Types.UTF8))
                .withColumn(new Column("id", Types.STRING))
                .withColumn(new Column("sms_code", Types.UINT32))
                .withColumn(new Column("sms_code_expiration", Types.DATETIME))
                .withColumn(new Column("verified", Types.BOOL))
                .withPrimaryKey("phone")
        )
    })
}

export async function isDatabaseRunning(session: Session, databaseId: string) {
    const databaseService = session.client(cloudApi.ydb.database_service.DatabaseServiceClient);

    const result = await databaseService.get(databaseApi.GetDatabaseRequest.fromPartial({
        databaseId: databaseId
    }));
    return result.status === Database_Status.RUNNING
}
