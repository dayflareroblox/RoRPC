import { RpcConnectionConfig } from "../types";
import { Connection } from "./Connection";

/**
 * Manages active RPC connections between the backend and Roblox game servers.
 */
export class RpcConnectionPool {
    private readonly connections = new Map<string, Connection>();

    /**
     * Establishes a new connection and stores it in the pool.
     * @param config - Connection configuration.
     * @returns The newly created Connection.
     */
    connect(config: RpcConnectionConfig): Connection {
        const connection = new Connection(config);
        this.connections.set(config.jobId, connection);
        return connection;
    }

    /**
     * Gracefully disconnects and removes a connection from the pool.
     * @param jobId - The Roblox job ID.
     */
    disconnect(jobId: string): void {
        const connection = this.connections.get(jobId);
        if (connection) {
            connection.disconnect();
            this.connections.delete(jobId);
        }
    }

    /**
     * Retrieves all active connections.
     * @returns A map of all current connections.
     */
    getAllConnections(): Map<string, Connection> {
        return this.connections;
    }

    /**
     * Retrieves a specific connection by job ID.
     * @param jobId - The Roblox job ID.
     * @returns The corresponding Connection or undefined.
     */
    getConnection(jobId: string): Connection | undefined {
        return this.connections.get(jobId);
    }

    /**
     * Checks if a connection exists and is considered active.
     * @param jobId - The Roblox job ID.
     * @returns True if the connection exists.
     */
    isConnected(jobId: string): boolean {
        return this.connections.has(jobId);
    }
}
