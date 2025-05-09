import express from "express";
import bodyParser from "body-parser";
import robloxWebhook from "./routes/robloxWebhook";
import { ENV } from "./configs/env";

import { RpcService } from "./rpc/RpcService";
import { RpcHandlerRegistry } from "./rpc/RpcHandlerRegistry";

const app = express();
app.use(bodyParser.json());

app.use("/webhook", robloxWebhook);

app.listen(ENV.PORT, () => {
  console.log(`Server running on port ${ENV.PORT}`);
});