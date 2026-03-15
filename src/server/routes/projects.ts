import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import { sseManager } from "@/server/lib/sse-manager";
import * as projectService from "@/server/services/project-service";

const projects = new Hono<OrgEnv>();

projects.use("*", requireOrg);

projects.get("/", async (c) => {
  const rows = await projectService.listProjects(c.get("organizationId"));
  return c.json(rows);
});

projects.get("/stats", async (c) => {
  const result = await projectService.getProjectStats(c.get("organizationId"));
  return c.json(result);
});

projects.get("/:id", async (c) => {
  const row = await projectService.getProject(c.get("organizationId"), c.req.param("id"));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

projects.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
    const result = await projectService.createProject(
      c.get("organizationId"),
      user.id,
      user.name ?? user.email,
      body
    );
    if ("error" in result) {
      const status = result.error === "Could not generate unique slug" ? 409 : 403;
      return c.json(result, status);
    }
    sseManager.broadcast(c.get("organizationId"), { type: "invalidate", entity: "projects" });
    return c.json(result, 201);
  }
);

projects.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      isPublic: z.boolean().optional(),
      slug: z
        .string()
        .min(1)
        .max(60)
        .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "Invalid slug format")
        .optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const row = await projectService.updateProject(
      c.get("organizationId"),
      user.id,
      user.name ?? user.email,
      c.req.param("id"),
      c.req.valid("json")
    );
    if (!row) return c.json({ error: "Not found" }, 404);
    if ("error" in row) return c.json(row, 409);
    sseManager.broadcast(c.get("organizationId"), { type: "invalidate", entity: "projects" });
    return c.json(row);
  }
);

projects.delete("/:id", async (c) => {
  const user = c.get("user");
  const row = await projectService.deleteProject(
    c.get("organizationId"),
    user.id,
    user.name ?? user.email,
    c.req.param("id")
  );
  if (!row) return c.json({ error: "Not found" }, 404);
  sseManager.broadcast(c.get("organizationId"), { type: "invalidate", entity: "projects" });
  return c.json({ success: true });
});

export default projects;
