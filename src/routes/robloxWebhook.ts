import { Router } from "express";
import { RpcService } from "../rpc/RpcService";

const router = Router();
const rpcService = new RpcService();

router.post("/roblox-webhook", async (req, res) => {
  try {
    await rpcService.handleIncomingRpc(req.body);
    res.status(200).send({ status: "ok" });
  } catch (err) {
    console.error("Error handling RPC:", err);
    res.status(500).send({ error: "Internal server error" });
  }
});

export default router;
