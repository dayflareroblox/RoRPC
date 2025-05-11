import { RobloxOpenCloudClient } from "./core/RobloxOpenCloudClient";
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

export interface RpcConnectionConfig {
    jobId: string;
    topic: string;
    timeoutMs: number;
    client: RobloxOpenCloudClient;
}

export interface RpcResponse {
    status: string;
    result?: any;
}

export interface RobloxOpenCloudClientConfig { apiKey: string; universeId: string }