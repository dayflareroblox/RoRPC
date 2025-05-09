import { RobloxOpenCloudClient } from "../core/RobloxOpenCloudClient";
import { v4 as uuidv4 } from "uuid";

type Resolver = (value: any) => void;

export class RpcService {
  private client = RobloxOpenCloudClient.getInstance();
  private pendingResponses: Map<string, Resolver> = new Map();

  async callClient(
    method: string,
    args: any,
    targetPlayerId: string,
  ): Promise<any> {
    const id = uuidv4();
    const topic = `rpc-global`;

    return new Promise((resolve) => {
      this.pendingResponses.set(id, resolve);

      this.client.publishMessage({
        topic: topic,
        message: JSON.stringify({
          type: "invoke",
          id,
          method,
          args,
        })
      });
    });
  }

  async handleIncomingRpc(body: any) {
    if (body.type === "invoke") {
      if (body.method === "GetInfo") {
        return {
          type: "response",
          id: body.id,
          result: "info info",
        };
      }
    } else if (body.type === "response" && body.id && this.pendingResponses.has(body.id)) {
      const resolver = this.pendingResponses.get(body.id)!;
      resolver(body.result);
      this.pendingResponses.delete(body.id);
    }
  }
}
