import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/server/db";
import { item, itemTag, section, project } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import { sseManager } from "@/server/lib/sse-manager";
import { logActivity } from "@/server/lib/log-activity";

const items = new Hono<OrgEnv>();

items.use("*", requireOrg);

/** Get projectId from a sectionId */
async function getProjectId(sectionId: string): Promise<string | null> {
  const [s] = await db
    .select({ projectId: section.projectId })
    .from(section)
    .where(eq(section.id, sectionId));
  return s?.projectId ?? null;
}

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
    const projectId = await getProjectId(body.sectionId);
    if (projectId) {
      sseManager.broadcast(projectId, { type: "invalidate", entity: "items" });
      const user = c.get("user");
      logActivity({
        projectId,
        actorId: user.id,
        actorName: user.name ?? user.email,
        action: "created",
        entity: "item",
        entityId: id,
        description: `Added item "${body.text}"`,
      });
    }
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
    const projectId = await getProjectId(row.sectionId);
    if (projectId) {
      sseManager.broadcast(projectId, { type: "invalidate", entity: "items" });
      const user = c.get("user");
      const action = body.checked !== undefined
        ? (body.checked ? "checked" : "unchecked")
        : "updated";
      logActivity({
        projectId,
        actorId: user.id,
        actorName: user.name ?? user.email,
        action: action as "checked" | "unchecked" | "updated",
        entity: "item",
        entityId: id,
        description: action === "checked"
          ? `Checked off "${existing.text}"`
          : action === "unchecked"
          ? `Unchecked "${existing.text}"`
          : `Updated item "${row.text}"`,
      });
    }
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
  const projectId = await getProjectId(existing.sectionId);
  if (projectId) {
    sseManager.broadcast(projectId, { type: "invalidate", entity: "items" });
    const user = c.get("user");
    logActivity({
      projectId,
      actorId: user.id,
      actorName: user.name ?? user.email,
      action: "deleted",
      entity: "item",
      entityId: id,
      description: `Deleted item "${existing.text}"`,
    });
  }
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

    const projectId = await getProjectId(existing.sectionId);
    if (projectId) {
      sseManager.broadcast(projectId, { type: "invalidate", entity: "items" });
      const user = c.get("user");
      logActivity({
        projectId,
        actorId: user.id,
        actorName: user.name ?? user.email,
        action: "updated",
        entity: "tag",
        entityId: id,
        description: tags.length > 0
          ? `Set tags [${tags.join(", ")}] on "${existing.text}"`
          : `Cleared tags on "${existing.text}"`,
      });
    }
    return c.json({ tags });
  }
);

export default items;
