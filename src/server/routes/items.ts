import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/server/db";
import { item, itemTag, section, project } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";

const items = new Hono<OrgEnv>();

items.use("*", requireOrg);

/** Verify a section belongs to the current org */
async function verifySectionOrg(sectionId: string, orgId: string) {
  const [row] = await db
    .select({ section: section, project: project })
    .from(section)
    .innerJoin(project, eq(section.projectId, project.id))
    .where(and(eq(section.id, sectionId), eq(project.organizationId, orgId)));
  return row ?? null;
}

// List items for a section (with tags)
items.get(
  "/",
  zValidator("query", z.object({ sectionId: z.string().min(1) })),
  async (c) => {
    const orgId = c.get("organizationId");
    const { sectionId } = c.req.valid("query");

    if (!(await verifySectionOrg(sectionId, orgId))) {
      return c.json({ error: "Section not found" }, 404);
    }

    const rows = await db
      .select()
      .from(item)
      .where(eq(item.sectionId, sectionId))
      .orderBy(item.order);

    // Batch-fetch tags for all items
    const itemIds = rows.map((r) => r.id);
    const tags =
      itemIds.length > 0
        ? await db
            .select()
            .from(itemTag)
            .where(inArray(itemTag.itemId, itemIds))
        : [];

    const tagsByItem = new Map<string, string[]>();
    for (const t of tags) {
      const arr = tagsByItem.get(t.itemId) ?? [];
      arr.push(t.tag);
      tagsByItem.set(t.itemId, arr);
    }

    const result = rows.map((r) => ({
      ...r,
      tags: tagsByItem.get(r.id) ?? [],
    }));
    return c.json(result);
  }
);

// Create item
items.post(
  "/",
  zValidator(
    "json",
    z.object({
      sectionId: z.string().min(1),
      text: z.string().min(1).max(500),
      order: z.number().int().optional(),
    })
  ),
  async (c) => {
    const orgId = c.get("organizationId");
    const body = c.req.valid("json");

    if (!(await verifySectionOrg(body.sectionId, orgId))) {
      return c.json({ error: "Section not found" }, 404);
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const [row] = await db
      .insert(item)
      .values({
        id,
        sectionId: body.sectionId,
        text: body.text,
        checked: false,
        order: body.order ?? 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return c.json({ ...row, tags: [] }, 201);
  }
);

// Update item
items.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      text: z.string().min(1).max(500).optional(),
      checked: z.boolean().optional(),
      order: z.number().int().optional(),
      sectionId: z.string().min(1).optional(), // for moves between sections
    })
  ),
  async (c) => {
    const orgId = c.get("organizationId");
    const id = c.req.param("id");
    const body = c.req.valid("json");

    // Verify current item's section belongs to org
    const [existing] = await db.select().from(item).where(eq(item.id, id));
    if (!existing) return c.json({ error: "Not found" }, 404);

    if (!(await verifySectionOrg(existing.sectionId, orgId))) {
      return c.json({ error: "Not found" }, 404);
    }

    // If moving to a new section, verify it also belongs to org
    if (body.sectionId && body.sectionId !== existing.sectionId) {
      if (!(await verifySectionOrg(body.sectionId, orgId))) {
        return c.json({ error: "Target section not found" }, 404);
      }
    }

    const [row] = await db
      .update(item)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(item.id, id))
      .returning();
    return c.json(row);
  }
);

// Delete item
items.delete("/:id", async (c) => {
  const orgId = c.get("organizationId");
  const id = c.req.param("id");

  const [existing] = await db.select().from(item).where(eq(item.id, id));
  if (!existing) return c.json({ error: "Not found" }, 404);

  if (!(await verifySectionOrg(existing.sectionId, orgId))) {
    return c.json({ error: "Not found" }, 404);
  }

  await db.delete(item).where(eq(item.id, id));
  return c.json({ success: true });
});

// Set tags (replace all)
items.post(
  "/:id/tags",
  zValidator(
    "json",
    z.object({
      tags: z.array(z.enum(["bug", "question", "later"])),
    })
  ),
  async (c) => {
    const orgId = c.get("organizationId");
    const id = c.req.param("id");
    const { tags } = c.req.valid("json");

    const [existing] = await db.select().from(item).where(eq(item.id, id));
    if (!existing) return c.json({ error: "Not found" }, 404);

    if (!(await verifySectionOrg(existing.sectionId, orgId))) {
      return c.json({ error: "Not found" }, 404);
    }

    // Delete existing tags and insert new ones
    await db.delete(itemTag).where(eq(itemTag.itemId, id));
    if (tags.length > 0) {
      await db.insert(itemTag).values(
        tags.map((tag) => ({
          id: crypto.randomUUID(),
          itemId: id,
          tag,
        }))
      );
    }

    return c.json({ tags });
  }
);

export default items;
