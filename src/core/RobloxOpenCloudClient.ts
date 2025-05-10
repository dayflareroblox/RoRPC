import axios from "axios";
import { RobloxOpenCloudClientConfig } from "../types";

export class RobloxOpenCloudClient {
  private apiKey: string;
  private universeId: string;

  constructor(config: RobloxOpenCloudClientConfig) {
    this.apiKey = config.apiKey;
    this.universeId = config.universeId;
  }

  async publishMessage(payload: any): Promise<void> {
    const url = `https://apis.roblox.com/cloud/v2/universes/${this.universeId}:publishMessage`;
    const headers = {
      "x-api-key": this.apiKey,
      "Content-Type": "application/json",
    };

    await axios.post(url, payload, { headers });
  }
}
