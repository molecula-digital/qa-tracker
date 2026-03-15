import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import * as sectionService from "@/server/services/section-service";

const sections = new Hono<OrgEnv>();

sections.use("*", requireOrg);

sections.get(
  "/",
  zValidator("query", z.object({ projectId: z.string().min(1) })),
  async (c) => {
    const result = await sectionService.listSections(
      c.get("organizationId"),
      c.req.valid("query").projectId
    );
    if (result === null) return c.json({ error: "Project not found" }, 404);
    return c.json(result);
  }
);

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
    const user = c.get("user");
    const result = await sectionService.createSection(
      c.get("organizationId"),
      user.id,
      user.name ?? user.email,
      c.req.valid("json")
    );
    if ("error" in result) {
      const status = result.error.includes("limit") ? 403 : 404;
      return c.json(result, status);
    }
    return c.json(result, 201);
  }
);

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
    const user = c.get("user");
    const row = await sectionService.updateSection(
      c.get("organizationId"),
      user.id,
      user.name ?? user.email,
      c.req.param("id"),
      c.req.valid("json")
    );
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  }
);

sections.delete("/:id", async (c) => {
  const user = c.get("user");
  const row = await sectionService.deleteSection(
    c.get("organizationId"),
    user.id,
    user.name ?? user.email,
    c.req.param("id")
  );
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

export default sections;
