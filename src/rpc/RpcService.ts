import { RobloxOpenCloudClient } from "../core/RobloxOpenCloudClient";
import { v4 as uuidv4 } from "uuid";

type Resolver = (value: any) => void;

export class RpcService {
  private client = RobloxOpenCloudClient.getInstance();
  private pendingResponses: Map<string, Resolver> = new Map();

  async callClient(
    method: string,
    args: any,
  ): Promise<any> {
    const id = uuidv4();
    const topic = `rpc-global`;

    return new Promise((resolve) => {
      this.pendingResponses.set(id, resolve);

      this.client.publishMessage({
        topic,
        message: JSON.stringify({
          type: "invoke",
          id,
          method,
          args,
          topic,
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
      const result = await this.resolveLocalRpc(body.method, body.args);

      const replyTopic = `rpc-global`;
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
    } else if (
      body.type === "response" &&
      body.id &&
      this.pendingResponses.has(body.id)
    ) {
      const resolver = this.pendingResponses.get(body.id)!;
      resolver(body.result);
      this.pendingResponses.delete(body.id);
    }
  }

  private async resolveLocalRpc(method: string, args: any): Promise<any> {
    if (method === "GetInfo") {
      return "info info";
    }

    return null;
  }
}
