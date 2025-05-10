class RpcConnectionPool {
  private activeServers: Set<string> = new Set();

  connect(jobId: string) {
    this.activeServers.add(jobId);
  }

  disconnect(jobId: string) {
    this.activeServers.delete(jobId);
  }

  isConnected(jobId: string): boolean {
    return this.activeServers.has(jobId);
  }

  getAll(): string[] {
    return [...this.activeServers];
  }
}
