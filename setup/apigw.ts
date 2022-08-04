import {serviceClients, Session} from "@yandex-cloud/nodejs-sdk";
import {
    CreateApiGatewayRequest
} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/serverless/apigateway/v1/apigateway_service";

export function setupAPIGateway(session: Session, folderId: string, name: string, spec: string) {
    const client = session.client(serviceClients.ApiGatewayServiceClient);

    client.create(CreateApiGatewayRequest.fromPartial({
        folderId: folderId,
        name: name,
        openapiSpec: spec
    }))
}