import axios from "axios";
import { ENV } from "../configs/env";

export class RobloxOpenCloudClient {
  private static _instance: RobloxOpenCloudClient;

  private constructor() {}

  public static getInstance(): RobloxOpenCloudClient {
    if (!RobloxOpenCloudClient._instance) {
      RobloxOpenCloudClient._instance = new RobloxOpenCloudClient();
    }
    return RobloxOpenCloudClient._instance;
  }

  async publishMessage(topic: string, payload: any): Promise<void> {
    const url = `https://apis.roblox.com/messaging-service/v1/universes/${ENV.UNIVERSE_ID}/topics/${topic}`;
    const headers = {
      "x-api-key": ENV.ROBLOX_API_KEY,
      "Content-Type": "application/json",
    };

    await axios.post(url, JSON.stringify(payload), { headers });
  }
}
