// rpc/RpcService.ts
import { RobloxOpenCloudClient } from "../core/RobloxOpenCloudClient";
import { v4 as uuidv4 } from "uuid";
import { RpcHandlerRegistry } from "./RpcHandlerRegistry";

const topic = `rpc-global`;
export class RpcService {
  private client = RobloxOpenCloudClient.getInstance();
  private pendingResponses: Map<string, (value: any) => void> = new Map();

  constructor(private handlers: RpcHandlerRegistry) {}

  async callClient(method: string, args: any, targetPlayerId?: string): Promise<any> {
    const id = uuidv4();

    return new Promise((resolve) => {
      this.pendingResponses.set(id, resolve);

      this.client.publishMessage({
        topic,
        message: JSON.stringify({
          type: "invoke",
          id,
          method,
          args,
        }),
      });

      setTimeout(() => {
        if (this.pendingResponses.has(id)) {
          this.pendingResponses.delete(id);
          resolve(null);
        }
      }, 10000);
    });
  }

  async handleIncomingRpc(body: any) {
    if (body.type === "invoke") {
      const result = await this.handlers.handle(body.method, body.args);
      const replyTopic = body.replyTopic ?? topic;
      
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
    } else if (body.type === "response" && body.id && this.pendingResponses.has(body.id)) {
      const resolver = this.pendingResponses.get(body.id)!;
      resolver(body.result);
      this.pendingResponses.delete(body.id);
    }
  }
}
