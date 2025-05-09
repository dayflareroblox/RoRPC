import { RobloxOpenCloudClient } from "../core/RobloxOpenCloudClient";

export class RpcService {
  private client = RobloxOpenCloudClient.getInstance();

  async callClient(method: string, args: any) {
    const topic = "rpc-global";
    const payload = {
      type: "invoke",
      method,
      args,
    };

    await this.client.publishMessage(topic, payload);
  }

  async handleIncomingRpc(body: any) {
    if (body.type === "invoke") {
      // Handle client->server RPC
      console.log(`RPC method: ${body.method}, args:`, body.args);

      // Add handler logic here
    }
  }
}
