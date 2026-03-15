import { Hono } from "hono";
import { logger } from "hono/logger";
import { auth } from "@/lib/auth";
import health from "./routes/health";

const app = new Hono().basePath("/api");

app.use("*", logger());

// Mount Better Auth — handles all /api/auth/* routes
app.on(["GET", "POST"], "/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

app.route("/health", health);

export default app;
export type AppType = typeof app;
