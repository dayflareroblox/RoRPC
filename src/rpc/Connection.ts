import { v4 as uuidv4 } from "uuid";
import { RobloxOpenCloudClient } from "../core/RobloxOpenCloudClient";
import { RpcHandler, RpcConnectionConfig, RpcResponse } from "../types";

/**
 * Represents a single RPC connection with a Roblox server instance.
 * Handles method calls, responses, and registration of handlers.
 */
export class Connection {
    public readonly jobId: string;
    private readonly topic: string;
    private readonly timeoutMs: number;
    private readonly client: RobloxOpenCloudClient;

    private pendingResponses = new Map<string, (value: any) => void>();
    private handlers = new Map<string, RpcHandler>();
    private isConnected = true;

    constructor(config: RpcConnectionConfig) {
        this.jobId = config.jobId;
        this.topic = config.topic;
        this.timeoutMs = config.timeoutMs;
        this.client = config.client;
    }

    /**
     * Registers a method handler specific to this connection.
     * @param method - The name of the method.
     * @param handler - The handler function.
     */
    registerHandler(method: string, handler: RpcHandler): void {
        if (this.handlers.has(method)) {
            throw new Error(`Handler for method '${method}' is already registered.`);
        }
        this.handlers.set(method, handler);
    }

    /**
     * Calls a method on the connected Roblox server.
     * @param method - Method name to invoke.
     * @param args - Arguments to pass.
     * @returns The result of the remote call or null if timed out/disconnected.
     */
    async call(method: string, args: any): Promise<any> {
        if (!this.isConnected) return null;

        const id = uuidv4();
        const promise = new Promise<any>((resolve) => {
            this.pendingResponses.set(id, resolve);

            setTimeout(() => {
                if (this.pendingResponses.has(id)) {
                    this.pendingResponses.delete(id);
                    resolve(null); // Timeout
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

    /**
     * Handles a method invocation from the Roblox server.
     * @param body - The invocation payload.
     * @returns A success response with the result or throws error if unhandled.
     */
    async handleInvocation(body: any): Promise<RpcResponse> {
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

    /**
     * Handles a response from a Roblox server for a previous call.
     * @param body - The response payload.
     * @returns Success status if resolved; otherwise throws error.
     */
    handleResponse(body: any): RpcResponse {
        if (!this.isConnected) {
            throw new Error("Connection is not active");
        }

        const resolver = this.pendingResponses.get(body.id);
        if (resolver) {
            resolver(body.result);
            this.pendingResponses.delete(body.id);
            return { status: "ok" };
        }

        throw new Error("Invalid or unknown response ID");
    }

    /**
     * Disconnects this connection and clears pending requests.
     */
    disconnect(): void {
        this.isConnected = false;
        for (const resolve of this.pendingResponses.values()) {
            resolve(null); // Clean resolve
        }
        this.pendingResponses.clear();
    }
}
