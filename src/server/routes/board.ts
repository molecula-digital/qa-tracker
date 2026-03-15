import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/server/db";
import { section, item, itemTag, note, project } from "@/server/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";

const board = new Hono<OrgEnv>();

board.use("*", requireOrg);

// GET /api/board?projectId=xxx — Full nested board data
board.get(
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

    // Fetch all sections ordered by `order`
    const sections = await db
      .select()
      .from(section)
      .where(eq(section.projectId, projectId))
      .orderBy(asc(section.order));

    if (sections.length === 0) {
      return c.json({ sections: [] });
    }

    const sectionIds = sections.map((s) => s.id);

    // Fetch all items for those sections ordered by `order`
    const items = await db
      .select()
      .from(item)
      .where(inArray(item.sectionId, sectionIds))
      .orderBy(asc(item.order));

    const itemIds = items.map((i) => i.id);

    // Fetch all tags for those items
    const tags =
      itemIds.length > 0
        ? await db
            .select()
            .from(itemTag)
            .where(inArray(itemTag.itemId, itemIds))
        : [];

    // Fetch all notes for those items ordered by createdAt
    const notes =
      itemIds.length > 0
        ? await db
            .select()
            .from(note)
            .where(inArray(note.itemId, itemIds))
            .orderBy(asc(note.createdAt))
        : [];

    // Build lookup maps
    const tagsByItem = new Map<string, string[]>();
    for (const t of tags) {
      const arr = tagsByItem.get(t.itemId) ?? [];
      arr.push(t.tag);
      tagsByItem.set(t.itemId, arr);
    }

    const notesByItem = new Map<
      string,
      { id: string; text: string; ts: number }[]
    >();
    for (const n of notes) {
      const arr = notesByItem.get(n.itemId) ?? [];
      arr.push({
        id: n.id,
        text: n.text,
        ts: new Date(n.createdAt).getTime(),
      });
      notesByItem.set(n.itemId, arr);
    }

    const itemsBySection = new Map<
      string,
      {
        id: string;
        text: string;
        checked: boolean;
        tags: string[];
        notes: { id: string; text: string; ts: number }[];
      }[]
    >();
    for (const i of items) {
      const arr = itemsBySection.get(i.sectionId) ?? [];
      arr.push({
        id: i.id,
        text: i.text,
        checked: i.checked,
        tags: tagsByItem.get(i.id) ?? [],
        notes: notesByItem.get(i.id) ?? [],
      });
      itemsBySection.set(i.sectionId, arr);
    }

    // Assemble the nested structure
    const result = sections.map((s) => ({
      id: s.id,
      title: s.title,
      open: s.open,
      color: s.color ?? undefined,
      icon: s.icon ?? undefined,
      items: itemsBySection.get(s.id) ?? [],
    }));

    return c.json({ sections: result });
  }
);

export default board;
