import { db } from "@/server/db";
import { section, item, itemTag, note, project, itemAssignee, user } from "@/server/db/schema";
import { eq, and, inArray, asc, sql } from "drizzle-orm";
import type { TagKey } from "@/types/tracker";

export async function getBoard(orgId: string, projectId: string) {
  const [proj] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)));
  if (!proj) return null;

  const sections = await db
    .select()
    .from(section)
    .where(eq(section.projectId, projectId))
    .orderBy(asc(section.order));

  if (sections.length === 0) return { sections: [] };

  const sectionIds = sections.map((s) => s.id);

  const items = await db
    .select()
    .from(item)
    .where(inArray(item.sectionId, sectionIds))
    .orderBy(asc(item.order));

  const itemIds = items.map((i) => i.id);

  const tags =
    itemIds.length > 0
      ? await db.select().from(itemTag).where(inArray(itemTag.itemId, itemIds))
      : [];

  const notes =
    itemIds.length > 0
      ? await db
          .select()
          .from(note)
          .where(inArray(note.itemId, itemIds))
          .orderBy(asc(note.createdAt))
      : [];

  const assignees = itemIds.length > 0
    ? await db.select({
        itemId: itemAssignee.itemId,
        userId: user.id,
        name: user.name,
        image: user.image,
      })
      .from(itemAssignee)
      .innerJoin(user, eq(itemAssignee.userId, user.id))
      .where(inArray(itemAssignee.itemId, itemIds))
    : [];

  const assigneesByItem = new Map<string, { id: string; name: string; image: string | null }[]>();
  for (const a of assignees) {
    const arr = assigneesByItem.get(a.itemId) ?? [];
    arr.push({ id: a.userId, name: a.name, image: a.image });
    assigneesByItem.set(a.itemId, arr);
  }

  const tagsByItem = new Map<string, TagKey[]>();
  for (const t of tags) {
    const arr = tagsByItem.get(t.itemId) ?? [];
    arr.push(t.tag as TagKey);
    tagsByItem.set(t.itemId, arr);
  }

  const notesByItem = new Map<string, { id: string; text: string; ts: number }[]>();
  for (const n of notes) {
    const arr = notesByItem.get(n.itemId) ?? [];
    arr.push({ id: n.id, text: n.text, ts: new Date(n.createdAt).getTime() });
    notesByItem.set(n.itemId, arr);
  }

  const itemsBySection = new Map<string, any[]>();
  for (const i of items) {
    const arr = itemsBySection.get(i.sectionId) ?? [];
    arr.push({
      id: i.id,
      text: i.text,
      checked: i.checked,
      priority: i.priority ?? null,
      createdAt: new Date(i.createdAt).getTime(),
      tags: tagsByItem.get(i.id) ?? [],
      notes: notesByItem.get(i.id) ?? [],
      assignees: assigneesByItem.get(i.id) ?? [],
    });
    itemsBySection.set(i.sectionId, arr);
  }

  const result = sections.map((s) => ({
    id: s.id,
    title: s.title,
    open: s.open,
    color: s.color ?? undefined,
    icon: s.icon ?? undefined,
    items: itemsBySection.get(s.id) ?? [],
  }));

  return { sections: result };
}

export async function getBoardForAI(orgId: string, projectId: string) {
  const [proj] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)));
  if (!proj) return null;

  const sections = await db
    .select()
    .from(section)
    .where(eq(section.projectId, projectId))
    .orderBy(asc(section.order));

  if (sections.length === 0) return { sections: [] };

  const sectionIds = sections.map((s) => s.id);

  const items = await db
    .select()
    .from(item)
    .where(inArray(item.sectionId, sectionIds))
    .orderBy(asc(item.order));

  const itemIds = items.map((i) => i.id);

  const tags =
    itemIds.length > 0
      ? await db.select().from(itemTag).where(inArray(itemTag.itemId, itemIds))
      : [];

  const noteCounts =
    itemIds.length > 0
      ? await db
          .select({
            itemId: note.itemId,
            count: sql<number>`count(*)`.as("count"),
          })
          .from(note)
          .where(inArray(note.itemId, itemIds))
          .groupBy(note.itemId)
      : [];

  const tagsByItem = new Map<string, TagKey[]>();
  for (const t of tags) {
    const arr = tagsByItem.get(t.itemId) ?? [];
    arr.push(t.tag as TagKey);
    tagsByItem.set(t.itemId, arr);
  }

  const noteCountMap = new Map(noteCounts.map((n) => [n.itemId, Number(n.count)]));

  const itemsBySection = new Map<string, any[]>();
  for (const i of items) {
    const arr = itemsBySection.get(i.sectionId) ?? [];
    arr.push({
      id: i.id,
      text: i.text,
      checked: i.checked,
      priority: i.priority ?? null,
      tags: tagsByItem.get(i.id) ?? [],
      noteCount: noteCountMap.get(i.id) ?? 0,
    });
    itemsBySection.set(i.sectionId, arr);
  }

  return {
    sections: sections.map((s) => ({
      id: s.id,
      title: s.title,
      color: s.color ?? undefined,
      icon: s.icon ?? undefined,
      items: itemsBySection.get(s.id) ?? [],
    })),
  };
}
