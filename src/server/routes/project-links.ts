import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import * as linkService from "@/server/services/project-link-service";

const projectLinks = new Hono<OrgEnv>();

projectLinks.use("*", requireOrg);

projectLinks.get(
  "/",
  zValidator("query", z.object({ projectId: z.string().min(1) })),
  async (c) => {
    const result = await linkService.listLinks(
      c.get("organizationId"),
      c.req.valid("query").projectId
    );
    if (result === null) return c.json({ error: "Project not found" }, 404);
    return c.json(result);
  }
);

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
    const result = await linkService.createLink(
      c.get("organizationId"),
      c.get("user").id,
      c.req.valid("json")
    );
    if ("error" in result) return c.json(result, 404);
    return c.json(result, 201);
  }
);

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
    const row = await linkService.updateLink(
      c.get("organizationId"),
      c.req.param("id"),
      c.req.valid("json")
    );
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  }
);

projectLinks.delete("/:id", async (c) => {
  const row = await linkService.deleteLink(
    c.get("organizationId"),
    c.req.param("id")
  );
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

export default projectLinks;
