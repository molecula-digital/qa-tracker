type SSEConnection = {
  controller: ReadableStreamDefaultController;
  projectId: string;
};

class SSEManager {
  private connections = new Map<string, Set<SSEConnection>>();

  add(
    projectId: string,
    controller: ReadableStreamDefaultController
  ): SSEConnection {
    const conn: SSEConnection = { controller, projectId };
    if (!this.connections.has(projectId)) {
      this.connections.set(projectId, new Set());
    }
    this.connections.get(projectId)!.add(conn);
    return conn;
  }

  remove(conn: SSEConnection) {
    const conns = this.connections.get(conn.projectId);
    if (conns) {
      conns.delete(conn);
      if (conns.size === 0) {
        this.connections.delete(conn.projectId);
      }
    }
  }

  broadcast(projectId: string, event: { type: string; entity: string }) {
    const conns = this.connections.get(projectId);
    if (!conns) return;

    const data = `event: invalidate\ndata: ${JSON.stringify(event)}\n\n`;
    const encoder = new TextEncoder();

    for (const conn of conns) {
      try {
        conn.controller.enqueue(encoder.encode(data));
      } catch {
        this.remove(conn);
      }
    }
  }

  getConnectionCount(projectId?: string): number {
    if (projectId) {
      return this.connections.get(projectId)?.size ?? 0;
    }
    let total = 0;
    for (const conns of this.connections.values()) {
      total += conns.size;
    }
    return total;
  }
}

export const sseManager = new SSEManager();
