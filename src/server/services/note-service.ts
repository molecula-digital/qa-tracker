import { db } from "@/server/db";
import { note, item, section, project } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { sseManager } from "@/server/lib/sse-manager";
import { logActivity } from "@/server/lib/log-activity";

async function getProjectIdFromItem(itemId: string): Promise<string | null> {
  const [row] = await db
    .select({ projectId: section.projectId })
    .from(item)
    .innerJoin(section, eq(item.sectionId, section.id))
    .where(eq(item.id, itemId));
  return row?.projectId ?? null;
}

async function verifyItemOrg(itemId: string, orgId: string) {
  const [row] = await db
    .select({ item: item, section: section, project: project })
    .from(item)
    .innerJoin(section, eq(item.sectionId, section.id))
    .innerJoin(project, eq(section.projectId, project.id))
    .where(and(eq(item.id, itemId), eq(project.organizationId, orgId)));
  return row ?? null;
}

export async function getItemNotes(orgId: string, itemId: string) {
  if (!(await verifyItemOrg(itemId, orgId))) return null;

  return db
    .select()
    .from(note)
    .where(eq(note.itemId, itemId))
    .orderBy(note.createdAt);
}

export async function createNote(
  orgId: string,
  userId: string,
  userName: string,
  data: { itemId: string; text: string }
) {
  if (!(await verifyItemOrg(data.itemId, orgId))) {
    return { error: "Item not found" } as const;
  }

  const id = crypto.randomUUID();
  const [row] = await db
    .insert(note)
    .values({
      id,
      itemId: data.itemId,
      text: data.text,
      createdBy: userId,
      createdAt: new Date(),
    })
    .returning();

  const projectId = await getProjectIdFromItem(data.itemId);
  if (projectId) {
    const sectionId = (await db.select({ sectionId: item.sectionId }).from(item).where(eq(item.id, data.itemId)))[0]?.sectionId;
    if (sectionId) {
      sseManager.broadcastPatch(projectId, {
        action: "note:create",
        sectionId,
        itemId: data.itemId,
        data: { id, text: data.text, ts: row.createdAt.getTime() },
      });
    }
    logActivity({
      projectId,
      actorId: userId,
      actorName: userName,
      action: "created",
      entity: "note",
      entityId: id,
      description: `Added a note on an item`,
    });
  }

  return row;
}

export async function deleteNote(
  orgId: string,
  userId: string,
  userName: string,
  noteId: string
) {
  const [existing] = await db.select().from(note).where(eq(note.id, noteId));
  if (!existing) return null;

  if (!(await verifyItemOrg(existing.itemId, orgId))) return null;

  await db.delete(note).where(eq(note.id, noteId));

  const projectId = await getProjectIdFromItem(existing.itemId);
  if (projectId) {
    const sectionId = (await db.select({ sectionId: item.sectionId }).from(item).where(eq(item.id, existing.itemId)))[0]?.sectionId;
    if (sectionId) {
      sseManager.broadcastPatch(projectId, {
        action: "note:delete",
        sectionId,
        itemId: existing.itemId,
        noteId,
      });
    }
    logActivity({
      projectId,
      actorId: userId,
      actorName: userName,
      action: "deleted",
      entity: "note",
      entityId: noteId,
      description: `Deleted a note`,
    });
  }

  return existing;
}
