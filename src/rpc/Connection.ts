import { v4 as uuidv4 } from "uuid";
import { RobloxOpenCloudClient } from "../core/RobloxOpenCloudClient";
import { RpcHandler, RpcConnectionConfig, RpcResponse } from "../types";

export class Connection {
    private jobId: string;
    private topic: string;
    private timeoutMs: number;
    private client: RobloxOpenCloudClient;
    private pendingResponses: Map<string, (value: any) => void> = new Map();
    private handlers: Map<string, RpcHandler> = new Map();
    private isConnected: boolean;

    constructor(config: RpcConnectionConfig) {
        this.jobId = config.jobId;
        this.topic = config.topic;
        this.timeoutMs = config.timeoutMs;
        this.client = config.client;
        this.isConnected = true;
    }

    registerHandler(method: string, handler: RpcHandler): void {
        if (this.handlers.has(method)) {
            throw new Error(`Handler for method '${method}' is already registered.`);
        }
        this.handlers.set(method, handler);
    }

    async call(method: string, args: any): Promise<any> {
        if (!this.isConnected) return undefined;

        const id = uuidv4();
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
            topic: this.topic,
            message: JSON.stringify({
                type: "invoke",
                id,
                method,
                args,
                jobId: this.jobId,
            }),
        });

        return promise;
    }

    async handleInvocation(body: any): Promise<any> {
        if (!this.isConnected) {
            throw new Error("Connection is not active");
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
                    jobId: this.jobId,
                }),
            });
        }

        return { status: "ok", result };
    }

    handleResponse(body: any): RpcResponse {
        if (!this.isConnected) {
            throw new Error("Connection is not active");
        }

        if (body.id && this.pendingResponses.has(body.id)) {
            const resolver = this.pendingResponses.get(body.id)!;
            resolver(body.result);
            this.pendingResponses.delete(body.id);
            return { status: "ok" };
        }

        console.log(body)
        throw new Error("Invalid RPC payload");
    }

    disconnect(): void {
        this.isConnected = false;
        // Clean up pending requests
        for (const resolver of this.pendingResponses.values()) {
            resolver(null); // Resolve all pending with null
        }
        this.pendingResponses.clear();
    }
}