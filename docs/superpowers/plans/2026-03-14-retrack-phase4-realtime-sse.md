# Phase 4: Real-Time Updates (SSE)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When any user mutates data in a project, all other connected clients see the update live via Server-Sent Events triggering React Query cache invalidations.

**Architecture:** Hono SSE endpoint at `/api/sse`. In-memory connection store maps projectId to active streams. Mutation routes broadcast invalidation events after writes. Client-side `useSSE` hook listens and calls `queryClient.invalidateQueries()`.

**Tech Stack:** Hono streaming, EventSource API, TanStack React Query

---

## File Structure

```
src/
├── server/
│   ├── routes/
│   │   └── sse.ts                    # SSE endpoint
│   ├── lib/
│   │   └── sse-manager.ts            # Connection store + broadcast
│   └── middleware/
│       └── broadcast.ts              # Post-mutation broadcast helper
├── hooks/
│   └── use-sse.ts                    # Client-side SSE hook
```

---

### Task 1: Create SSE Connection Manager

**Files:**
- Create: `src/server/lib/sse-manager.ts`

- [ ] **Step 1: Create `src/server/lib/sse-manager.ts`**

```ts
// src/server/lib/sse-manager.ts

type SSEConnection = {
  controller: ReadableStreamDefaultController;
  projectId: string;
};

class SSEManager {
  private connections = new Map<string, Set<SSEConnection>>();

  add(projectId: string, controller: ReadableStreamDefaultController): SSEConnection {
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
        // Connection closed, clean up
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
```

- [ ] **Step 2: Commit**

```bash
git add src/server/lib/sse-manager.ts
git commit -m "feat: add sse connection manager"
```

---

### Task 2: Create SSE Endpoint

**Files:**
- Create: `src/server/routes/sse.ts`
- Modify: `src/server/app.ts`

- [ ] **Step 1: Create SSE route `src/server/routes/sse.ts`**

```ts
// src/server/routes/sse.ts
import { Hono } from "hono";
import { requireOrg } from "@/server/middleware/org";
import { sseManager } from "@/server/lib/sse-manager";

const sse = new Hono();

sse.use("*", requireOrg);

sse.get("/", (c) => {
  const projectId = c.req.query("projectId");
  if (!projectId) {
    return c.json({ error: "projectId required" }, 400);
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ projectId })}\n\n`)
      );

      // Register connection
      const conn = sseManager.add(projectId, controller);

      // Keep-alive ping every 30s
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
          sseManager.remove(conn);
        }
      }, 30000);

      // Note: cleanup on client disconnect is handled by the try/catch
      // in broadcast and ping — when enqueue fails, the connection is removed.
    },
    cancel() {
      // Stream cancelled by client
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

export default sse;
```

- [ ] **Step 2: Mount in `src/server/app.ts`**

```ts
import sse from "./routes/sse";
app.route("/sse", sse);
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add sse endpoint for real-time updates"
```

---

### Task 3: Add Broadcast Calls to Mutation Routes

**Files:**
- Modify: `src/server/routes/sections.ts`, `src/server/routes/items.ts`, `src/server/routes/notes.ts`

- [ ] **Step 1: Add broadcasts to section routes**

After each successful create/update/delete in `src/server/routes/sections.ts`, add:

```ts
import { sseManager } from "@/server/lib/sse-manager";

// After section create:
sseManager.broadcast(body.projectId, { type: "invalidate", entity: "sections" });

// After section update — need to look up projectId from the section:
sseManager.broadcast(result.projectId, { type: "invalidate", entity: "sections" });

// After section delete:
sseManager.broadcast(result.projectId, { type: "invalidate", entity: "sections" });
```

- [ ] **Step 2: Add broadcasts to item routes**

In `src/server/routes/items.ts`, after each mutation, look up the section's projectId and broadcast:

```ts
import { sseManager } from "@/server/lib/sse-manager";
import { section } from "@/server/db/schema";

// Helper to get projectId from sectionId
async function getProjectId(sectionId: string): Promise<string | null> {
  const [s] = await db.select({ projectId: section.projectId }).from(section).where(eq(section.id, sectionId));
  return s?.projectId ?? null;
}

// After item create/update/delete, call:
const projectId = await getProjectId(sectionId);
if (projectId) sseManager.broadcast(projectId, { type: "invalidate", entity: "items" });
```

- [ ] **Step 3: Add broadcasts to note routes**

Similar pattern for `src/server/routes/notes.ts` — look up itemId → sectionId → projectId, then broadcast.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: broadcast sse events on data mutations"
```

---

### Task 4: Create Client-Side SSE Hook

**Files:**
- Create: `src/hooks/use-sse.ts`

- [ ] **Step 1: Create `src/hooks/use-sse.ts`**

```ts
// src/hooks/use-sse.ts
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useSSE(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const url = `/api/sse?projectId=${encodeURIComponent(projectId)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("invalidate", (event) => {
      try {
        const data = JSON.parse(event.data);
        // Invalidate the relevant query cache
        queryClient.invalidateQueries({
          queryKey: [data.entity, projectId],
        });
      } catch {
        // Ignore parse errors
      }
    });

    eventSource.addEventListener("connected", () => {
      console.log(`[SSE] Connected to project ${projectId}`);
    });

    eventSource.onerror = () => {
      // EventSource auto-reconnects, just log
      console.log("[SSE] Connection error, reconnecting...");
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [projectId, queryClient]);
}
```

- [ ] **Step 2: Use the hook in the project page**

Add to `src/app/dashboard/projects/[id]/page.tsx`:

```ts
import { useSSE } from "@/hooks/use-sse";

// Inside the component, after hooks:
useSSE(id);
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add client-side sse hook for real-time invalidation"
```
