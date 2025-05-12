import { RobloxOpenCloudClient } from "./core/RobloxOpenCloudClient.js";
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

export interface GlobalPendingRequest {
    resolve: (responses: Array<{ jobId: string; response: any }>) => void;
    expectedJobs: Set<string>;
    responses: Map<string, any>;
}

export interface RpcResponse {
    status: string;
    result?: any;
}

export interface RobloxOpenCloudClientConfig { apiKey: string; universeId: string }