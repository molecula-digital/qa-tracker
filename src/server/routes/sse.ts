import { Hono } from "hono";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import { sseManager } from "@/server/lib/sse-manager";

const sse = new Hono<OrgEnv>();

sse.use("*", requireOrg);

sse.get("/", (c) => {
  const projectId = c.req.query("projectId");
  if (!projectId) {
    return c.json({ error: "projectId required" }, 400);
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ projectId })}\n\n`
        )
      );
      const conn = sseManager.add(projectId, controller);

      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
          sseManager.remove(conn);
        }
      }, 30000);
    },
    cancel() {},
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
