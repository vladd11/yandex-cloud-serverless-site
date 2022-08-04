import {Database} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/ydb/v1/database";

export default function getDatabasePath(cloudID: string, database: Database) {
    return `/${database.locationId}/${cloudID}/${database.id}`
}