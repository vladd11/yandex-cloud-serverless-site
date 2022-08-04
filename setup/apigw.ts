import {serviceClients, Session, waitForOperation} from "@yandex-cloud/nodejs-sdk";
import {
    CreateApiGatewayRequest
} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/serverless/apigateway/v1/apigateway_service";
import {ApiGateway} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/serverless/apigateway/v1/apigateway";

export async function setupAPIGateway(session: Session, folderId: string, name: string, spec: string): Promise<ApiGateway> {
    const client = session.client(serviceClients.ApiGatewayServiceClient);

    return ApiGateway.decode((
        await waitForOperation(await client.create(CreateApiGatewayRequest.fromPartial({
            folderId: folderId,
            name: name,
            openapiSpec: spec
        })), session)
    ).response!.value)
}