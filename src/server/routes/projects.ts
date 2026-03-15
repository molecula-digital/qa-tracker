import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/server/db";
import { project } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import { canCreateProject } from "@/server/lib/plan-limits";
import { sseManager } from "@/server/lib/sse-manager";

const projects = new Hono<OrgEnv>();

projects.use("*", requireOrg);

// List org projects
projects.get("/", async (c) => {
  const orgId = c.get("organizationId");
  const rows = await db
    .select()
    .from(project)
    .where(eq(project.organizationId, orgId))
    .orderBy(project.createdAt);
  return c.json(rows);
});

// Get single project
projects.get("/:id", async (c) => {
  const orgId = c.get("organizationId");
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, id), eq(project.organizationId, orgId)));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// Create project
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
    const orgId = c.get("organizationId");
    const user = c.get("user");
    const body = c.req.valid("json");

    const allowed = await canCreateProject(orgId);
    if (!allowed) {
      return c.json({ error: "Project limit reached for current plan" }, 403);
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const [row] = await db
      .insert(project)
      .values({
        id,
        name: body.name,
        description: body.description ?? null,
        organizationId: orgId,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    sseManager.broadcast(orgId, { type: "invalidate", entity: "projects" });
    return c.json(row, 201);
  }
);

// Update project
projects.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
    })
  ),
  async (c) => {
    const orgId = c.get("organizationId");
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const [row] = await db
      .update(project)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(project.id, id), eq(project.organizationId, orgId)))
      .returning();
    if (!row) return c.json({ error: "Not found" }, 404);
    sseManager.broadcast(orgId, { type: "invalidate", entity: "projects" });
    return c.json(row);
  }
);

// Delete project
projects.delete("/:id", async (c) => {
  const orgId = c.get("organizationId");
  const id = c.req.param("id");
  const [row] = await db
    .delete(project)
    .where(and(eq(project.id, id), eq(project.organizationId, orgId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  sseManager.broadcast(orgId, { type: "invalidate", entity: "projects" });
  return c.json({ success: true });
});

export default projects;
