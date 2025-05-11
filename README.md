# Roblox RPC Service (Open Cloud)

A framework-agnostic Remote Procedure Call (RPC) system over Roblox Open Cloud Messaging. Designed to be embedded in any HTTP-based server (Express, NestJS, Sapphire, Hono, etc.), allowing seamless communication with Roblox servers using topics.

## ✨ Features

- 🚀 Bi-directional RPC communication
- 🔗 Connection management for dedicated server jobs
- ⏱️ Configurable timeouts
- 📦 Message serialization/deserialization
- 🔐 API key authentication
- 🌐 Global and job-specific communication channels

## Installation
```bash
npm install rorpc@latest
```

## Usage

### Basic Setup
```ts
import { RpcService } from 'rorpc';

const rpcService = new RpcService({
  apiKey: 'your-api-key',
  universeId: 'your-universe-id',
  topic: 'custom-topic',
  timeoutMs: 15000
});
```

### Reading POST requests

Example with express:
```ts
import express from "express";
import bodyParser from "body-parser";
import { service } from "./service";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post("/rpc", async (req, res) => {
  try {
    const result = await service.handleRpcBody(req.body);
    res.json({ status: "ok", result });
  } catch (error) {
    console.error("RPC Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`RoRPC server listening on port ${PORT}`);
});

```

### Registering Handlers
Handlers are used to bind incoming calls to the RPC service, for example if your roblox game is requesting data, you would register handlers to fetch and return the data to the game server.
```ts
// Global handler
rpcService.registerHandler('getPlayerData', async (playerId) => {
  return await fetchPlayerData(playerId);
});

// Server-specific handler
rpcService.registerHandler('updateJobStatus', async (status) => {
  // Server-specific logic
}, 'job-123');
```

### Making RPC Calls
RPC Calls are used to fetch data from roblox servers, similar to handlers but reversed. This allows you to retrieve live information from all game servers or specific ones, depending on job specifics.
```ts
// Global call
const playerData = await rpcService.call('getPlayerData', 'player-123');

// Server-specific call
const result = await rpcService.call('updateConfig', { setting: 'value' }, 'job-123');
```