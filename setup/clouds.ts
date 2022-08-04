import {serviceClients, Session} from "@yandex-cloud/nodejs-sdk";
import {ListCloudsRequest} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/resourcemanager/v1/cloud_service";
import {Cloud} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/resourcemanager/v1/cloud";
import {Folder} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/resourcemanager/v1/folder";
import {
    ListFoldersRequest
} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/resourcemanager/v1/folder_service";

export async function listClouds(session: Session): Promise<Cloud[]> {
    return (await session.client(serviceClients.CloudServiceClient).list(ListCloudsRequest.fromPartial({}))).clouds
}

export async function listFolders(session: Session): Promise<Folder[]> {
    return  (await session.client(serviceClients.FolderServiceClient).list(ListFoldersRequest.fromPartial({}))).folders
}
