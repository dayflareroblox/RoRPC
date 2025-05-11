import { RpcConnectionConfig } from "../types";
import { Connection } from "./Connection";
export class RpcConnectionPool {
    private connections: Map<string, Connection> = new Map();

    connect(config: RpcConnectionConfig): Connection {
        const connection = new Connection(config);
        this.connections.set(config.jobId, connection);
        return connection;
    }

    disconnect(jobId: string): void {
        const connection = this.connections.get(jobId);
        if (connection) {
            connection.disconnect();
            this.connections.delete(jobId);
        }
    }

    getConnection(jobId: string): Connection | undefined {
        return this.connections.get(jobId);
    }

    isConnected(jobId: string): boolean {
        return this.connections.has(jobId);
    }
}