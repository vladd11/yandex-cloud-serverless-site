import {serviceClients, Session, waitForOperation} from "@yandex-cloud/nodejs-sdk";
import {
    CreateServiceAccountRequest
} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/iam/v1/service_account_service";
import {ServiceAccount} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/iam/v1/service_account";
import {
    AccessBindingAction,
    UpdateAccessBindingsRequest
} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/access/access";
import {
    CreateIamTokenForServiceAccountRequest
} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/iam/v1/iam_token_service";

export async function createServiceAccount(session: Session, folderId: string, name: string): Promise<ServiceAccount> {
    const client = session.client(serviceClients.ServiceAccountServiceClient);
    const folderClient = session.client(serviceClients.FolderServiceClient);

    const account = ServiceAccount.decode((await client.create(CreateServiceAccountRequest.fromPartial({
        folderId: folderId,
        name: name
    }))).response!.value);

    await waitForOperation(await folderClient.updateAccessBindings(UpdateAccessBindingsRequest.fromPartial({
        resourceId: folderId,
        accessBindingDeltas: [
            {
                action: AccessBindingAction.ADD,
                accessBinding: {
                    roleId: "ydb.viewer",
                    subject: {
                        type: "serviceAccount",
                        id: account.id
                    }
                }
            },
            {
                action: AccessBindingAction.ADD,
                accessBinding: {
                    roleId: "ydb.editor",
                    subject: {
                        type: "serviceAccount",
                        id: account.id
                    }
                }
            }
        ]
    })), session)

    return account;
}

export async function getIamTokenForServiceAccount(session: Session, serviceAccountId: string): Promise<string> {
    const client = session.client(serviceClients.IamTokenServiceClient);

    const result = await client.createForServiceAccount(CreateIamTokenForServiceAccountRequest.fromPartial({
        serviceAccountId: serviceAccountId
    }))
    return result.iamToken
}