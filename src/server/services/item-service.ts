import { db } from "@/server/db";
import { item, itemTag, itemAssignee, section, project, user } from "@/server/db/schema";
import { eq, and, inArray, sql, ilike } from "drizzle-orm";
import { sseManager } from "@/server/lib/sse-manager";
import { logActivity } from "@/server/lib/log-activity";
import * as notificationService from "./notification-service";

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
      data: { id, text: data.text, checked: false, priority: data.priority ?? null, tags: data.tags ?? [], notes: [] as never[], assignees: [] },
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

  // Notify assignees of changes
  if (projectId) {
    const assigneeRows = await db.select({ userId: itemAssignee.userId })
      .from(itemAssignee).where(eq(itemAssignee.itemId, itemId));
    const assigneeIds = assigneeRows.map(a => a.userId);
    if (assigneeIds.length > 0) {
      const notifType = data.checked !== undefined ? "item_checked" as const : "item_updated" as const;
      const notifTitle = data.checked !== undefined
        ? `Item ${data.checked ? 'completed' : 'reopened'}: ${row.text}`
        : `Item updated: ${row.text}`;
      const action2 =
        data.checked !== undefined
          ? data.checked
            ? "completed"
            : "reopened"
          : "updated";
      notificationService.notifyAssignees(
        itemId, projectId, userId, notifType,
        notifTitle,
        `${userName} ${action2} "${row.text}"`,
        assigneeIds,
      );
    }
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

export async function setItemAssignees(
  orgId: string,
  userId: string,
  userName: string,
  itemId: string,
  assigneeIds: string[]
) {
  const [existing] = await db.select().from(item).where(eq(item.id, itemId));
  if (!existing) return null;
  if (!(await verifySectionOrg(existing.sectionId, orgId))) return null;

  // Get current assignees before change
  const currentAssignees = await db.select({ userId: itemAssignee.userId })
    .from(itemAssignee).where(eq(itemAssignee.itemId, itemId));
  const currentIds = currentAssignees.map(a => a.userId);

  // Replace all assignees
  await db.delete(itemAssignee).where(eq(itemAssignee.itemId, itemId));
  if (assigneeIds.length > 0) {
    await db.insert(itemAssignee).values(
      assigneeIds.map((uid) => ({
        id: crypto.randomUUID(),
        itemId,
        userId: uid,
      }))
    );
  }

  // Fetch assignee details for SSE
  const assignees = assigneeIds.length > 0
    ? await db.select({ id: user.id, name: user.name, image: user.image })
        .from(user).where(inArray(user.id, assigneeIds))
    : [];

  const projectId = await getProjectId(existing.sectionId);
  if (projectId) {
    sseManager.broadcastPatch(projectId, {
      action: "item:assignees",
      sectionId: existing.sectionId,
      itemId,
      assignees,
    });

    // Notify newly added assignees
    const newAssignees = assigneeIds.filter(id => !currentIds.includes(id));
    if (newAssignees.length > 0) {
      notificationService.notifyAssignees(
        itemId, projectId, userId, "assigned",
        `Assigned to: ${existing.text}`,
        `${userName} assigned you to "${existing.text}"`,
        newAssignees,
      );
    }

    logActivity({
      projectId,
      actorId: userId,
      actorName: userName,
      action: "updated",
      entity: "item",
      entityId: itemId,
      description: `Updated assignees on "${existing.text}"`,
    });
  }

  return { assignees };
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
