import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/server/db";
import { section, project } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import { canCreateSection } from "@/server/lib/plan-limits";
import { sseManager } from "@/server/lib/sse-manager";

const sections = new Hono<OrgEnv>();

sections.use("*", requireOrg);

// List sections for a project (verify project belongs to org)
sections.get(
  "/",
  zValidator("query", z.object({ projectId: z.string().min(1) })),
  async (c) => {
    const orgId = c.get("organizationId");
    const { projectId } = c.req.valid("query");

    // Verify project belongs to org
    const [proj] = await db
      .select()
      .from(project)
      .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)));
    if (!proj) return c.json({ error: "Project not found" }, 404);

    const rows = await db
      .select()
      .from(section)
      .where(eq(section.projectId, projectId))
      .orderBy(section.order);
    return c.json(rows);
  }
);

// Create section
sections.post(
  "/",
  zValidator(
    "json",
    z.object({
      projectId: z.string().min(1),
      title: z.string().min(1).max(100),
      order: z.number().int().optional(),
      color: z.string().max(20).optional(),
      icon: z.string().max(50).optional(),
    })
  ),
  async (c) => {
    const orgId = c.get("organizationId");
    const body = c.req.valid("json");

    // Verify project belongs to org
    const [proj] = await db
      .select()
      .from(project)
      .where(
        and(
          eq(project.id, body.projectId),
          eq(project.organizationId, orgId)
        )
      );
    if (!proj) return c.json({ error: "Project not found" }, 404);

    const allowed = await canCreateSection(body.projectId);
    if (!allowed) {
      return c.json(
        { error: "Section limit reached for current plan" },
        403
      );
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const [row] = await db
      .insert(section)
      .values({
        id,
        projectId: body.projectId,
        title: body.title,
        order: body.order ?? 0,
        color: body.color ?? null,
        icon: body.icon ?? null,
        open: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    sseManager.broadcast(body.projectId, { type: "invalidate", entity: "sections" });
    return c.json(row, 201);
  }
);

// Update section
sections.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      title: z.string().min(1).max(100).optional(),
      order: z.number().int().optional(),
      color: z.string().max(20).nullable().optional(),
      icon: z.string().max(50).nullable().optional(),
      open: z.boolean().optional(),
    })
  ),
  async (c) => {
    const orgId = c.get("organizationId");
    const id = c.req.param("id");
    const body = c.req.valid("json");

    // Verify section belongs to org via project
    const [existing] = await db
      .select({ section: section, project: project })
      .from(section)
      .innerJoin(project, eq(section.projectId, project.id))
      .where(and(eq(section.id, id), eq(project.organizationId, orgId)));
    if (!existing) return c.json({ error: "Not found" }, 404);

    const [row] = await db
      .update(section)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(section.id, id))
      .returning();
    sseManager.broadcast(row.projectId, { type: "invalidate", entity: "sections" });
    return c.json(row);
  }
);

// Delete section
sections.delete("/:id", async (c) => {
  const orgId = c.get("organizationId");
  const id = c.req.param("id");

  // Verify section belongs to org via project
  const [existing] = await db
    .select({ section: section, project: project })
    .from(section)
    .innerJoin(project, eq(section.projectId, project.id))
    .where(and(eq(section.id, id), eq(project.organizationId, orgId)));
  if (!existing) return c.json({ error: "Not found" }, 404);

  await db.delete(section).where(eq(section.id, id));
  sseManager.broadcast(existing.section.projectId, { type: "invalidate", entity: "sections" });
  return c.json({ success: true });
});

export default sections;
