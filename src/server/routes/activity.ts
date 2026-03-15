import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import { getActivity } from "@/server/services/activity-service";

const activityRoute = new Hono<OrgEnv>();

activityRoute.use("*", requireOrg);

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
    const { projectId, limit, offset } = c.req.valid("query");
    const result = await getActivity(
      c.get("organizationId"),
      projectId,
      limit,
      offset
    );
    if (result === null) return c.json({ error: "Project not found" }, 404);
    return c.json(result);
  }
);

export default activityRoute;
