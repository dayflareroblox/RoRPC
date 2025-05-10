import { v4 as uuidv4 } from "uuid";
import { RobloxOpenCloudClient } from "../core/RobloxOpenCloudClient";
import { RpcHandler, RpcServiceConfig } from "../types";
import { RpcConnectionPool } from "./RpcConnectionPool";
export class RpcService {
    private client: RobloxOpenCloudClient;
    private pendingResponses: Map<string, (value: any) => void> = new Map();
    private handlers: Map<string, RpcHandler> = new Map();
    private connectionPool: RpcConnectionPool = new RpcConnectionPool()
    private topic: string;
    private timeoutMs: number;

    constructor(config: RpcServiceConfig) {
        this.topic = config.topic ?? "rpc-global";
        this.timeoutMs = config.timeoutMs ?? 10000;
        this.client = new RobloxOpenCloudClient({
            apiKey: config.apiKey,
            universeId: config.universeId,
        });
    }

    registerHandler(method: string, handler: RpcHandler): void {
        if (this.handlers.has(method)) {
            throw new Error(`Handler for method '${method}' is already registered.`);
        }
        this.handlers.set(method, handler);
    }

    async callClient(method: string, args: any, jobId?: string): Promise<any> {
        if (jobId) {
            if (!this.connectionPool.isConnected(jobId)) return undefined
        }

        const id = uuidv4();
        const topic = jobId ? `rpc-${jobId}` : this.topic;

        const promise = new Promise<any>((resolve) => {
            this.pendingResponses.set(id, resolve);

            setTimeout(() => {
                if (this.pendingResponses.has(id)) {
                    this.pendingResponses.delete(id);
                    resolve(null);
                }
            }, this.timeoutMs);
        });

        await this.client.publishMessage({
            topic: topic,
            message: JSON.stringify({
                type: "invoke",
                id,
                method,
                args,
            }),
        });

        return promise;
    }

    async handleRpcBody(body: any): Promise<any> {
        if (body.type === "connect" && body.jobId) {
            this.connectionPool.connect(body.jobId);
            return { status: "connected" };
        }

        if (body.type === "disconnect" && body.jobId) {
            this.connectionPool.disconnect(body.jobId);
            return { status: "disconnected" };
        }

        if (body.type === "invoke") {
            if (body.jobId && !this.connectionPool.isConnected(body.jobId)) {
                throw new Error("Got invocation request from client that isn't connected.")
            }

            const handler = this.handlers.get(body.method);
            if (!handler) {
                throw new Error(`No handler registered for method '${body.method}'`);
            }

            const result = await handler(body.args);
            const replyTopic = body.replyTopic ?? this.topic;

            if (body.id) {
                await this.client.publishMessage({
                    topic: replyTopic,
                    message: JSON.stringify({
                        type: "response",
                        id: body.id,
                        result,
                    }),
                });
            }

            return { status: "ok", result };
        }

        if (body.type === "response" && body.id && this.pendingResponses.has(body.id)) {
            if (body.jobId && !this.connectionPool.isConnected(body.jobId)) {
                throw new Error("Got response request from client that isn't connected.")
            }

            const resolver = this.pendingResponses.get(body.id)!;
            resolver(body.result);
            this.pendingResponses.delete(body.id);
            return { status: "ok" };
        }

        throw new Error("Invalid RPC payload");
    }
}
