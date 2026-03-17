import { getRequestSSEClientId } from "./request-context";

type SSEConnection = {
  controller: ReadableStreamDefaultController;
  projectId: string;
  clientId: string;
};

export type SSEPatch =
  | { action: "section:create"; data: { id: string; title: string; open: boolean; color?: string; icon?: string } }
  | { action: "section:update"; sectionId: string; data: Record<string, unknown> }
  | { action: "section:delete"; sectionId: string }
  | { action: "section:reorder"; sectionIds: string[] }
  | { action: "item:create"; sectionId: string; data: { id: string; text: string; checked: boolean; priority?: string | null; tags: string[]; notes: never[]; assignees: { id: string; name: string; image: string | null }[] } }
  | { action: "item:update"; sectionId: string; itemId: string; data: Record<string, unknown> }
  | { action: "item:delete"; sectionId: string; itemId: string }
  | { action: "item:tags"; sectionId: string; itemId: string; tags: string[] }
  | { action: "note:create"; sectionId: string; itemId: string; data: { id: string; text: string; ts: number } }
  | { action: "note:delete"; sectionId: string; itemId: string; noteId: string }
  | { action: "item:assignees"; sectionId: string; itemId: string; assignees: { id: string; name: string; image: string | null }[] };

class SSEManager {
  private connections = new Map<string, Set<SSEConnection>>();

  add(
    projectId: string,
    controller: ReadableStreamDefaultController,
    clientId: string
  ): SSEConnection {
    const conn: SSEConnection = { controller, projectId, clientId };
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
    this._send(projectId, "invalidate", event);
  }

  broadcastPatch(projectId: string, patch: SSEPatch) {
    this._send(projectId, "patch", patch);
  }

  private _send(projectId: string, eventName: string, payload: unknown) {
    const conns = this.connections.get(projectId);
    if (!conns) return;

    const excludeClientId = getRequestSSEClientId();
    const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
    const encoder = new TextEncoder();

    for (const conn of conns) {
      if (excludeClientId && conn.clientId === excludeClientId) continue;
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
