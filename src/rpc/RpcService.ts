import { v4 as uuidv4 } from "uuid";
import { RobloxOpenCloudClient } from "../core/RobloxOpenCloudClient";
import { RpcHandler, RpcServiceConfig } from "../types";

export class RpcService {
  private client: RobloxOpenCloudClient;
  private pendingResponses: Map<string, (value: any) => void> = new Map();
  private handlers: Map<string, RpcHandler> = new Map();
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

  async callClient(method: string, args: any): Promise<any> {
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
      }),
    });

    return promise;
  }

  async handleRpcBody(body: any): Promise<any> {
    if (body.type === "invoke") {
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
      const resolver = this.pendingResponses.get(body.id)!;
      resolver(body.result);
      this.pendingResponses.delete(body.id);
      return { status: "ok" };
    }

    throw new Error("Invalid RPC payload");
  }
}
