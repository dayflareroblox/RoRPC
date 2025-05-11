import { RobloxOpenCloudClient } from "../core/RobloxOpenCloudClient";
import { RpcHandler, RpcServiceConfig } from "../types";
import { RpcConnectionPool } from "./RpcConnectionPool";
import { Connection } from "./Connection";
import { v4 as uuidv4 } from "uuid";

export class RpcService {
    private client: RobloxOpenCloudClient;
    private connectionPool: RpcConnectionPool = new RpcConnectionPool();
    private globalPendingResponses: Map<string, (value: any) => void> = new Map();
    private globalHandlers: Map<string, RpcHandler> = new Map();
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

    registerHandler(method: string, handler: RpcHandler, jobId?: string): void {
        if (jobId) {
            const connection = this.connectionPool.getConnection(jobId);
            if (!connection) {
                throw new Error(`No connection found for jobId '${jobId}'`);
            }
            connection.registerHandler(method, handler);
        } else {
            if (this.globalHandlers.has(method)) {
                throw new Error(`Handler for method '${method}' is already registered.`);
            }
            this.globalHandlers.set(method, handler);
        }
    }

    async call(method: string, args: any, jobId?: string): Promise<any> {
        if (jobId) {
            const connection = this.connectionPool.getConnection(jobId);
            if (!connection) return undefined;
            return connection.call(method, args);
        }

        return this.globalCall(method, args);
    }

    private async globalCall(method: string, args: any): Promise<any> {
        const id = uuidv4();

        const promise = new Promise<any>((resolve) => {
            this.globalPendingResponses.set(id, resolve);

            setTimeout(() => {
                if (this.globalPendingResponses.has(id)) {
                    this.globalPendingResponses.delete(id);
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
            }),
        });

        return promise;
    }

    async handleRpcBody(body: any): Promise<any> {
        if (body.type == "connect" && body.jobId) {
            const connection = this.connectionPool.connect({
                jobId: body.jobId,
                topic: `rpc-${body.jobId}`,
                timeoutMs: this.timeoutMs,
                client: this.client,
            });
            return { status: "connected" };
        }

        if (body.type == "disconnect" && body.jobId) {
            this.connectionPool.disconnect(body.jobId);
            return { status: "disconnected" };
        }

        if (body.type == "invoke") {
            if (body.jobId) {
                const connection = this.connectionPool.getConnection(body.jobId);
                if (!connection) {
                    throw new Error("Got invocation request from client that isn't connected.");
                }
                return connection.handleInvocation(body);
            } else {
                const handler = this.globalHandlers.get(body.method);
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
        }

        if (body.type === "response") {
            if (!body.id || !this.globalPendingResponses.has(body.id)) {
                throw new Error("Invalid or untracked response");
            }

            const isGlobalResponse = this.globalPendingResponses.has(body.id)

            if (!isGlobalResponse && body.jobId) {
                const connection = this.connectionPool.getConnection(body.jobId);
                if (!connection) throw new Error("Job not connected");
                return connection.handleResponse(body);
            } else {
                const resolver = this.globalPendingResponses.get(body.id)!;
                resolver(body.result);
                this.globalPendingResponses.delete(body.id);
                return { status: "ok" };
            }
        }

        console.log(body)
        throw new Error("Invalid RPC payload");
    }
}