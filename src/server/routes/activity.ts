import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/server/db";
import { activity, project } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";

const activityRoute = new Hono<OrgEnv>();

activityRoute.use("*", requireOrg);

// List activity for a project
activityRoute.get(
  "/",
  zValidator(
    "query",
    z.object({
      projectId: z.string().min(1),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    })
  ),
  async (c) => {
    const orgId = c.get("organizationId");
    const { projectId, limit = 50, offset = 0 } = c.req.valid("query");

    // Verify project belongs to org
    const [proj] = await db
      .select()
      .from(project)
      .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)));
    if (!proj) return c.json({ error: "Project not found" }, 404);

    const rows = await db
      .select()
      .from(activity)
      .where(eq(activity.projectId, projectId))
      .orderBy(desc(activity.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json(rows);
  }
);

export default activityRoute;
