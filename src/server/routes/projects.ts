import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/server/db";
import { project, section, item, activity } from "@/server/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import { canCreateProject } from "@/server/lib/plan-limits";
import { sseManager } from "@/server/lib/sse-manager";
import { slugify, slugifyWithSuffix } from "@/lib/slugify";

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

// Project stats for dashboard
projects.get("/stats", async (c) => {
  const orgId = c.get("organizationId");

  // Get all org projects
  const orgProjects = await db
    .select()
    .from(project)
    .where(eq(project.organizationId, orgId))
    .orderBy(project.updatedAt);

  if (orgProjects.length === 0) return c.json([]);

  const projectIds = orgProjects.map((p) => p.id);

  // Aggregate section + item counts per project in one query
  const statsRows = await db
    .select({
      projectId: section.projectId,
      sectionCount: sql<number>`count(distinct ${section.id})`.as("section_count"),
      itemCount: sql<number>`count(distinct ${item.id})`.as("item_count"),
      doneCount: sql<number>`count(distinct case when ${item.checked} = true then ${item.id} end)`.as("done_count"),
    })
    .from(section)
    .leftJoin(item, eq(item.sectionId, section.id))
    .where(sql`${section.projectId} in ${projectIds}`)
    .groupBy(section.projectId);

  // Recent activity counts (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activityRows = await db
    .select({
      projectId: activity.projectId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(activity)
    .where(
      and(
        sql`${activity.projectId} in ${projectIds}`,
        gte(activity.createdAt, sevenDaysAgo)
      )
    )
    .groupBy(activity.projectId);

  const statsMap = new Map(statsRows.map((r) => [r.projectId, r]));
  const activityMap = new Map(activityRows.map((r) => [r.projectId, Number(r.count)]));

  const result = orgProjects.map((p) => {
    const s = statsMap.get(p.id);
    return {
      ...p,
      sectionCount: Number(s?.sectionCount ?? 0),
      itemCount: Number(s?.itemCount ?? 0),
      doneCount: Number(s?.doneCount ?? 0),
      recentActivityCount: activityMap.get(p.id) ?? 0,
    };
  });

  return c.json(result);
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

    // Generate slug from name with collision retry
    let slug = slugify(body.name);
    let slugAvailable = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const [existing] = await db
        .select({ id: project.id })
        .from(project)
        .where(and(eq(project.organizationId, orgId), eq(project.slug, slug)));
      if (!existing) { slugAvailable = true; break; }
      slug = slugifyWithSuffix(body.name);
    }
    if (!slugAvailable) {
      return c.json({ error: "Could not generate unique slug" }, 409);
    }

    const [row] = await db
      .insert(project)
      .values({
        id,
        name: body.name,
        description: body.description ?? null,
        slug,
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
    const orgId = c.get("organizationId");
    const id = c.req.param("id");
    const body = c.req.valid("json");

    // Check slug uniqueness if slug is being changed
    if (body.slug) {
      const [existing] = await db
        .select({ id: project.id })
        .from(project)
        .where(
          and(
            eq(project.organizationId, orgId),
            eq(project.slug, body.slug),
          )
        );
      if (existing && existing.id !== id) {
        return c.json({ error: "Slug already in use" }, 409);
      }
    }

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
