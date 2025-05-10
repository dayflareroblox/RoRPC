export interface RpcMessage {
    type: "invoke";
    method: string;
    args: any;
}

export type RpcHandler = (args: any) => Promise<any> | any;

export interface RpcServiceConfig {
    universeId: string;
    apiKey: string;
    topic?: string;
    timeoutMs?: number;
}

export interface RobloxOpenCloudClientConfig { apiKey: string; universeId: string }