import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import * as itemService from "@/server/services/item-service";

const items = new Hono<OrgEnv>();

items.use("*", requireOrg);

items.get(
  "/",
  zValidator("query", z.object({ sectionId: z.string().min(1) })),
  async (c) => {
    const result = await itemService.listItems(
      c.get("organizationId"),
      c.req.valid("query").sectionId
    );
    if (result === null) return c.json({ error: "Section not found" }, 404);
    return c.json(result);
  }
);

items.post(
  "/",
  zValidator(
    "json",
    z.object({
      sectionId: z.string().min(1),
      text: z.string().min(1).max(500),
      order: z.number().int().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      tags: z.array(z.enum(["bug", "question", "later"])).optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const result = await itemService.createItem(
      c.get("organizationId"),
      user.id,
      user.name ?? user.email,
      c.req.valid("json")
    );
    if ("error" in result) return c.json(result, 404);
    return c.json(result, 201);
  }
);

items.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      text: z.string().min(1).max(500).optional(),
      checked: z.boolean().optional(),
      order: z.number().int().optional(),
      sectionId: z.string().min(1).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).nullable().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const row = await itemService.updateItem(
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

items.delete("/:id", async (c) => {
  const user = c.get("user");
  const row = await itemService.deleteItem(
    c.get("organizationId"),
    user.id,
    user.name ?? user.email,
    c.req.param("id")
  );
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

items.post(
  "/:id/tags",
  zValidator(
    "json",
    z.object({
      tags: z.array(z.enum(["bug", "question", "later"])),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const result = await itemService.setItemTags(
      c.get("organizationId"),
      user.id,
      user.name ?? user.email,
      c.req.param("id"),
      c.req.valid("json").tags
    );
    if (result === null) return c.json({ error: "Not found" }, 404);
    return c.json(result);
  }
);

export default items;
