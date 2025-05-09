// rpc/RpcHandlerRegistry.ts
import * as fs from "fs";
import * as path from "path";

export class RpcHandlerRegistry {
  private handlers: Map<string, (args: any) => Promise<any>> = new Map();

  constructor(handlerDir: string) {
    this.loadHandlers(handlerDir);
  }

  private loadHandlers(handlerDir: string) {
    const files = fs.readdirSync(handlerDir);

    for (const file of files) {
      if (file.endsWith(".js") || file.endsWith(".ts")) {
        const methodName = path.basename(file, path.extname(file));
        const handler = require(path.join(handlerDir, file)).default;
        if (typeof handler === "function") {
          this.handlers.set(methodName, handler);
        }
      }
    }
  }

  async handle(method: string, args: any): Promise<any> {
    const handler = this.handlers.get(method);
    if (!handler) {
      throw new Error(`No handler registered for RPC method '${method}'`);
    }
    return await handler(args);
  }
}
