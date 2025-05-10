import { Router } from "express";
import * as path from "path";
import { RpcHandlerRegistry } from "../rpc/RpcHandlerRegistry";
import { RpcService } from "../rpc/RpcService";

const router = Router();

const handlers = new RpcHandlerRegistry(path.join(__dirname, "../rpc/handlers"));
const rpcService = new RpcService(handlers);

setInterval(async () => {
  const resp = await rpcService.callClient("GetRobloxInfo", {})
  console.log("Server -> Roblox Response", resp)
}, 5000);

router.post("/roblox-webhook", async (req: any, res: any) => {
  try {
    await rpcService.handleIncomingRpc(req.body);
    res.status(200).send({ status: "ok" });
  } catch (err) {
    console.error("Error handling RPC:", err);
    res.status(500).send({ error: "Internal server error" });
  }
});

export default router;
