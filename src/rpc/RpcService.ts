import { v4 as uuidv4 } from "uuid";
import { RobloxOpenCloudClient } from "../core/RobloxOpenCloudClient";
import { GlobalPendingRequest, RpcHandler, RpcServiceConfig } from "../types";
import { RpcConnectionPool } from "./RpcConnectionPool";
import { Connection } from "./Connection";

/**
 * The RpcService manages RPC calls between your backend and Roblox servers using Open Cloud Messaging.
 * Supports per-server RPC (by JobId) and global RPC (to all servers).
 */
export class RpcService {
    private client: RobloxOpenCloudClient;
    private connectionPool = new RpcConnectionPool();
    private globalPendingRequests = new Map<string, GlobalPendingRequest>();
    private globalHandlers = new Map<string, RpcHandler>();
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

    /**
     * Registers an RPC method handler either globally or for a specific JobId.
     */
    registerHandler(method: string, handler: RpcHandler, jobId?: string): void {
        if (jobId) {
            const connection = this.connectionPool.getConnection(jobId);
            if (!connection) throw new Error(`No connection for JobId '${jobId}'`);
            connection.registerHandler(method, handler);
        } else {
            if (this.globalHandlers.has(method)) {
                throw new Error(`Global handler for method '${method}' already exists.`);
            }
            this.globalHandlers.set(method, handler);
        }
    }

    /**
     * Calls an RPC method. If jobId is provided, it targets a specific server.
     * Otherwise, invokes a global call and waits for responses.
     */
    async call(method: string, args: any, jobId?: string): Promise<any> {
        if (jobId) {
            const connection = this.connectionPool.getConnection(jobId);
            return connection?.call(method, args);
        }
        return this.globalCall(method, args);
    }

    /**
     * Performs a global RPC call and collects responses from all connected servers.
     */
    private async globalCall(method: string, args: any): Promise<Array<{ jobId: string; response: any }>> {
        const id = uuidv4();
        const activeConnections = this.connectionPool.getAllConnections();
        const expectedJobs = new Set<string>();
        const responses = new Map<string, any>();

        for (const [jobId] of activeConnections) {
            expectedJobs.add(jobId);
        }

        const promise = new Promise<Array<{ jobId: string; response: any }>>((resolve) => {
            this.globalPendingRequests.set(id, { resolve, expectedJobs, responses });
            setTimeout(() => {
                const req = this.globalPendingRequests.get(id);
                if (req) {
                    const result = Array.from(req.responses.entries()).map(([jobId, response]) => ({ jobId, response }));
                    req.resolve(result);
                    this.globalPendingRequests.delete(id);
                }
            }, this.timeoutMs);
        });

        await this.client.publishMessage({
            topic: this.topic,
            message: JSON.stringify({ type: "invoke", id, method, args }),
        });

        return promise;
    }

    /**
     * Handles an incoming RPC payload from Roblox Open Cloud.
     */
    async handleRpcBody(body: any): Promise<any> {
        switch (body.type) {
            case "connect":
                if (body.jobId) {
                    this.connectionPool.connect({
                        jobId: body.jobId,
                        topic: `rpc-${body.jobId}`,
                        timeoutMs: this.timeoutMs,
                        client: this.client,
                    });
                    return { status: "connected" };
                }
                break;

            case "disconnect":
                if (body.jobId) {
                    this.connectionPool.disconnect(body.jobId);
                    return { status: "disconnected" };
                }
                break;

            case "invoke":
                if (body.jobId) {
                    const conn = this.connectionPool.getConnection(body.jobId);
                    if (!conn) throw new Error("Invocation from unregistered job.");
                    return conn.handleInvocation(body);
                } else {
                    const handler = this.globalHandlers.get(body.method);
                    if (!handler) throw new Error(`No global handler for '${body.method}'`);

                    const result = await handler(body.args);
                    if (body.id) {
                        await this.client.publishMessage({
                            topic: body.replyTopic ?? this.topic,
                            message: JSON.stringify({
                                type: "response",
                                id: body.id,
                                result,
                                jobId: "global",
                            }),
                        });
                    }
                    return { status: "ok", result };
                }

            case "response":
                if (body.id) {
                    const pending = this.globalPendingRequests.get(body.id);
                    if (pending && body.result.jobId) {
                        pending.responses.set(body.result.jobId, body.result);
                        if (pending.responses.size === pending.expectedJobs.size) {
                            const results = Array.from(pending.responses.entries()).map(([jobId, response]) => ({
                                jobId: jobId,
                                response: response.response
                            }));
                            pending.resolve(results);
                            this.globalPendingRequests.delete(body.id);
                        }
                        return { status: "ok" };
                    }

                    const connection = this.connectionPool.getConnection(body.result.jobId);
                    if (!connection) throw new Error("Unknown jobId in response.");
                    return connection.handleResponse(body);
                }
                break;
        }

        console.warn("Unhandled RPC payload:", body);
        throw new Error("Invalid RPC payload");
    }
}