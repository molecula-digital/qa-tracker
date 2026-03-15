import { Hono } from "hono";
import { logger } from "hono/logger";
import { auth } from "@/lib/auth";
import health from "./routes/health";
import projects from "./routes/projects";
import sections from "./routes/sections";
import items from "./routes/items";
import notes from "./routes/notes";
import sse from "./routes/sse";
import board from "./routes/board";
import activityRoute from "./routes/activity";
import projectLinksRoute from "./routes/project-links";

const app = new Hono().basePath("/api");

app.use("*", logger());

// Mount Better Auth — handles all /api/auth/* routes
app.on(["GET", "POST"], "/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

app.route("/health", health);
app.route("/projects", projects);
app.route("/sections", sections);
app.route("/items", items);
app.route("/notes", notes);
app.route("/sse", sse);
app.route("/board", board);
app.route("/activity", activityRoute);
app.route("/project-links", projectLinksRoute);

export default app;
export type AppType = typeof app;
