import express from "express";
import bodyParser from "body-parser";
import { RpcService } from "./rpc/RpcService";
import * as path from "path";

const app = express();

const rpcService = new RpcService({
  universeId: "7666715298",
  apiKey: "c9VlVbvQgUeHmQsETDcFk8NCRb/khSTuUMwOVA6iJLpzSGXzZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluTnBaeTB5TURJeExUQTNMVEV6VkRFNE9qVXhPalE1V2lJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaVlYTmxRWEJwUzJWNUlqb2lZemxXYkZaaWRsRm5WV1ZJYlZGelJWUkVZMFpyT0U1RFVtSXZhMmhUVkhWVlRYZFBWa0UyYVVwTWNIcFRSMWg2SWl3aWIzZHVaWEpKWkNJNklqRTJPVFE1TURnMElpd2lZWFZrSWpvaVVtOWliRzk0U1c1MFpYSnVZV3dpTENKcGMzTWlPaUpEYkc5MVpFRjFkR2hsYm5ScFkyRjBhVzl1VTJWeWRtbGpaU0lzSW1WNGNDSTZNVGMwTmpjNE56SXlNU3dpYVdGMElqb3hOelEyTnpnek5qSXhMQ0p1WW1ZaU9qRTNORFkzT0RNMk1qRjkuZkZvM3duOUhoZkhoTVdPVkJxbm8tWUpraU9Ka3ZrVVdObEFwZkxBRGZmREQwSWNxREtJclk0cjF4TkhCLVptSFptX3JJVUZtLXVJTmpwV3dMc0xJT01JS2RXTVJZRzJZcjAtRzFJRFNaNUpiRGRXZDhad1F6QmJDZlplUGZpVnhyRjQyOFlnVlVxMU1UZDVDRjQ4QWhEUGcyd05zSm9GZlVmdTN0QTJ2cFBvbUJ5TWxsQml4R0VxQVpOejRhbkF3QlNhbTZJLWRES19MT3lrVGV1bWdKV0NuaV9rUDZTZ2Yzc21DRFQySW1YR1Ffb0tjN20ybllLb3o5SnkzTUFyaWZJay1BdXppdTktYUJXbDd3ZlVOYlg5VlhfRUllSU5ERTFjakFmc3NoX3ZCd2gyTDliQ3pRQnM0NW42SllicVpKSWZOVktxTl9GZmJWTE5MMFV3ZUlB",
  topic: "rpc-global",
  timeoutMs: 15000,
});

rpcService.registerHandler("GetRobloxInfo", async () => {
  return { name: "Ash", id: 1234 };
});

app.use(bodyParser.json());

app.post("/rpc", async (req, res) => {
  try {
    const result = await rpcService.handleRpcBody(req.body);
    res.status(200).json(result);
  } catch (err: any) {
    console.error("RPC Error", err);
    res.status(400).json({ error: err.message });
  }
});

app.listen(8080, () => console.log("RPC listening"));
