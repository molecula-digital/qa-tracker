import { db } from "@/server/db";
import { item, itemTag, section, project } from "@/server/db/schema";
import { eq, and, inArray, sql, ilike } from "drizzle-orm";
import { sseManager } from "@/server/lib/sse-manager";
import { logActivity } from "@/server/lib/log-activity";

async function getProjectId(sectionId: string): Promise<string | null> {
  const [s] = await db
    .select({ projectId: section.projectId })
    .from(section)
    .where(eq(section.id, sectionId));
  return s?.projectId ?? null;
}

async function verifySectionOrg(sectionId: string, orgId: string) {
  const [row] = await db
    .select({ section: section, project: project })
    .from(section)
    .innerJoin(project, eq(section.projectId, project.id))
    .where(and(eq(section.id, sectionId), eq(project.organizationId, orgId)));
  return row ?? null;
}

export async function listItems(orgId: string, sectionId: string) {
  if (!(await verifySectionOrg(sectionId, orgId))) return null;

  const rows = await db
    .select()
    .from(item)
    .where(eq(item.sectionId, sectionId))
    .orderBy(item.order);

  const itemIds = rows.map((r) => r.id);
  const tags =
    itemIds.length > 0
      ? await db.select().from(itemTag).where(inArray(itemTag.itemId, itemIds))
      : [];

  const tagsByItem = new Map<string, string[]>();
  for (const t of tags) {
    const arr = tagsByItem.get(t.itemId) ?? [];
    arr.push(t.tag);
    tagsByItem.set(t.itemId, arr);
  }

  return rows.map((r) => ({ ...r, tags: tagsByItem.get(r.id) ?? [] }));
}

export async function createItem(
  orgId: string,
  userId: string,
  userName: string,
  data: { sectionId: string; text: string; order?: number; priority?: "low" | "medium" | "high" | "urgent"; tags?: ("bug" | "question" | "later")[] }
) {
  if (!(await verifySectionOrg(data.sectionId, orgId))) {
    return { error: "Section not found" } as const;
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const [row] = await db
    .insert(item)
    .values({
      id,
      sectionId: data.sectionId,
      text: data.text,
      checked: false,
      order: data.order ?? 0,
      priority: data.priority ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (data.tags && data.tags.length > 0) {
    await db.insert(itemTag).values(
      data.tags.map((tag) => ({
        id: crypto.randomUUID(),
        itemId: id,
        tag,
      }))
    );
  }

  const projectId = await getProjectId(data.sectionId);
  if (projectId) {
    sseManager.broadcastPatch(projectId, {
      action: "item:create",
      sectionId: data.sectionId,
      data: { id, text: data.text, checked: false, priority: data.priority ?? null, tags: data.tags ?? [], notes: [] as never[] },
    });
    logActivity({
      projectId,
      actorId: userId,
      actorName: userName,
      action: "created",
      entity: "item",
      entityId: id,
      description: `Added item "${data.text}"`,
    });
  }

  return { ...row, tags: data.tags ?? [] };
}

export async function updateItem(
  orgId: string,
  userId: string,
  userName: string,
  itemId: string,
  data: { text?: string; checked?: boolean; order?: number; sectionId?: string; priority?: "low" | "medium" | "high" | "urgent" | null }
) {
  const [existing] = await db.select().from(item).where(eq(item.id, itemId));
  if (!existing) return null;

  if (!(await verifySectionOrg(existing.sectionId, orgId))) return null;

  if (data.sectionId && data.sectionId !== existing.sectionId) {
    if (!(await verifySectionOrg(data.sectionId, orgId))) return null;
  }

  const [row] = await db
    .update(item)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(item.id, itemId))
    .returning();

  const projectId = await getProjectId(row.sectionId);
  if (projectId) {
    sseManager.broadcastPatch(projectId, {
      action: "item:update",
      sectionId: existing.sectionId,
      itemId,
      data: { text: row.text, checked: row.checked, priority: row.priority ?? null },
    });
    const action =
      data.checked !== undefined
        ? data.checked
          ? "checked"
          : "unchecked"
        : "updated";
    logActivity({
      projectId,
      actorId: userId,
      actorName: userName,
      action: action as "checked" | "unchecked" | "updated",
      entity: "item",
      entityId: itemId,
      description:
        action === "checked"
          ? `Checked off "${existing.text}"`
          : action === "unchecked"
            ? `Unchecked "${existing.text}"`
            : `Updated item "${row.text}"`,
    });
  }

  return row;
}

export async function deleteItem(
  orgId: string,
  userId: string,
  userName: string,
  itemId: string
) {
  const [existing] = await db.select().from(item).where(eq(item.id, itemId));
  if (!existing) return null;

  if (!(await verifySectionOrg(existing.sectionId, orgId))) return null;

  await db.delete(item).where(eq(item.id, itemId));

  const projectId = await getProjectId(existing.sectionId);
  if (projectId) {
    sseManager.broadcastPatch(projectId, {
      action: "item:delete",
      sectionId: existing.sectionId,
      itemId,
    });
    logActivity({
      projectId,
      actorId: userId,
      actorName: userName,
      action: "deleted",
      entity: "item",
      entityId: itemId,
      description: `Deleted item "${existing.text}"`,
    });
  }

  return existing;
}

export async function setItemTags(
  orgId: string,
  userId: string,
  userName: string,
  itemId: string,
  tags: ("bug" | "question" | "later")[]
) {
  const [existing] = await db.select().from(item).where(eq(item.id, itemId));
  if (!existing) return null;

  if (!(await verifySectionOrg(existing.sectionId, orgId))) return null;

  await db.delete(itemTag).where(eq(itemTag.itemId, itemId));
  if (tags.length > 0) {
    await db.insert(itemTag).values(
      tags.map((tag) => ({
        id: crypto.randomUUID(),
        itemId,
        tag,
      }))
    );
  }

  const projectId = await getProjectId(existing.sectionId);
  if (projectId) {
    sseManager.broadcastPatch(projectId, {
      action: "item:tags",
      sectionId: existing.sectionId,
      itemId,
      tags,
    });
    logActivity({
      projectId,
      actorId: userId,
      actorName: userName,
      action: "updated",
      entity: "tag",
      entityId: itemId,
      description:
        tags.length > 0
          ? `Set tags [${tags.join(", ")}] on "${existing.text}"`
          : `Cleared tags on "${existing.text}"`,
    });
  }

  return { tags };
}

export async function searchItems(
  orgId: string,
  query: string,
  projectId?: string
) {
  const rows = await db
    .select({
      id: item.id,
      text: item.text,
      checked: item.checked,
      sectionId: item.sectionId,
      sectionTitle: section.title,
      projectId: project.id,
      projectName: project.name,
    })
    .from(item)
    .innerJoin(section, eq(item.sectionId, section.id))
    .innerJoin(project, eq(section.projectId, project.id))
    .where(
      and(
        eq(project.organizationId, orgId),
        ilike(item.text, `%${query}%`),
        ...(projectId ? [eq(project.id, projectId)] : [])
      )
    )
    .limit(20);

  return rows;
}
