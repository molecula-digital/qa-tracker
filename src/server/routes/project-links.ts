import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/server/db";
import { projectLink, project } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import { sseManager } from "@/server/lib/sse-manager";

const projectLinks = new Hono<OrgEnv>();

projectLinks.use("*", requireOrg);

/** Verify a project belongs to the current org */
async function verifyProjectOrg(projectId: string, orgId: string) {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)));
  return row ?? null;
}

// List links for a project
projectLinks.get(
  "/",
  zValidator("query", z.object({ projectId: z.string().min(1) })),
  async (c) => {
    const orgId = c.get("organizationId");
    const { projectId: pid } = c.req.valid("query");

    if (!(await verifyProjectOrg(pid, orgId))) {
      return c.json({ error: "Project not found" }, 404);
    }

    const rows = await db
      .select()
      .from(projectLink)
      .where(eq(projectLink.projectId, pid))
      .orderBy(projectLink.order);
    return c.json(rows);
  }
);

// Create link
projectLinks.post(
  "/",
  zValidator(
    "json",
    z.object({
      projectId: z.string().min(1),
      title: z.string().min(1).max(200),
      url: z.string().url().max(2000),
      icon: z.string().max(50).optional(),
    })
  ),
  async (c) => {
    const orgId = c.get("organizationId");
    const user = c.get("user");
    const body = c.req.valid("json");

    if (!(await verifyProjectOrg(body.projectId, orgId))) {
      return c.json({ error: "Project not found" }, 404);
    }

    const id = crypto.randomUUID();
    const [row] = await db
      .insert(projectLink)
      .values({
        id,
        projectId: body.projectId,
        title: body.title,
        url: body.url,
        icon: body.icon ?? "link",
        createdBy: user.id,
        createdAt: new Date(),
      })
      .returning();
    sseManager.broadcast(body.projectId, { type: "invalidate", entity: "project-links" });
    return c.json(row, 201);
  }
);

// Update link
projectLinks.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      title: z.string().min(1).max(200).optional(),
      url: z.string().url().max(2000).optional(),
      icon: z.string().max(50).optional(),
    })
  ),
  async (c) => {
    const orgId = c.get("organizationId");
    const id = c.req.param("id");

    const [existing] = await db.select().from(projectLink).where(eq(projectLink.id, id));
    if (!existing) return c.json({ error: "Not found" }, 404);

    if (!(await verifyProjectOrg(existing.projectId, orgId))) {
      return c.json({ error: "Not found" }, 404);
    }

    const body = c.req.valid("json");
    const [row] = await db
      .update(projectLink)
      .set(body)
      .where(eq(projectLink.id, id))
      .returning();
    sseManager.broadcast(existing.projectId, { type: "invalidate", entity: "project-links" });
    return c.json(row);
  }
);

// Delete link
projectLinks.delete("/:id", async (c) => {
  const orgId = c.get("organizationId");
  const id = c.req.param("id");

  const [existing] = await db.select().from(projectLink).where(eq(projectLink.id, id));
  if (!existing) return c.json({ error: "Not found" }, 404);

  if (!(await verifyProjectOrg(existing.projectId, orgId))) {
    return c.json({ error: "Not found" }, 404);
  }

  await db.delete(projectLink).where(eq(projectLink.id, id));
  sseManager.broadcast(existing.projectId, { type: "invalidate", entity: "project-links" });
  return c.json({ success: true });
});

export default projectLinks;
