# Roblox RPC Service (Open Cloud)

A framework-agnostic Remote Procedure Call (RPC) system over Roblox Open Cloud Messaging. Designed to be embedded in any HTTP-based server (Express, NestJS, Sapphire, Hono, etc.), allowing seamless communication with Roblox servers using topics.

## ✨ Features

- 🔧 Framework-agnostic: Works with any HTTP server.
- ⚡ Simple handler registration: `rpc.registerHandler("MethodName", asyncFn)`
- 🔒 Configurable: No environment dependency — supply API keys and universe ID programmatically.
- 🔄 Supports request/response cycle via Open Cloud topics.
- ⏱ Built-in timeout handling.
- 🔌 Extensible architecture (plugin/hooks ready).

---

## 📦 Installation

```bash
npm install axios uuid
