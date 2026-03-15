import { db } from "@/server/db";
import { section, item, project } from "@/server/db/schema";
import { eq, and, sql, asc, inArray } from "drizzle-orm";
import { getPlanLimits } from "@/server/lib/plan-limits";
import { sseManager } from "@/server/lib/sse-manager";
import { logActivity } from "@/server/lib/log-activity";

export async function verifyProjectOrg(projectId: string, orgId: string) {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)));
  return row ?? null;
}

export async function listSections(orgId: string, projectId: string) {
  if (!(await verifyProjectOrg(projectId, orgId))) return null;

  const sections = await db
    .select()
    .from(section)
    .where(eq(section.projectId, projectId))
    .orderBy(section.order);

  const sectionIds = sections.map((s) => s.id);
  if (sectionIds.length === 0) return sections.map((s) => ({ ...s, itemCount: 0 }));

  const countRows = await db
    .select({
      sectionId: item.sectionId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(item)
    .where(sql`${item.sectionId} in ${sectionIds}`)
    .groupBy(item.sectionId);

  const countMap = new Map(countRows.map((r) => [r.sectionId, Number(r.count)]));

  return sections.map((s) => ({
    ...s,
    itemCount: countMap.get(s.id) ?? 0,
  }));
}

export async function createSection(
  orgId: string,
  userId: string,
  userName: string,
  data: { projectId: string; title: string; order?: number; color?: string; icon?: string }
) {
  // Single query: verify project ownership + count sections + get max order
  const [info] = await db
    .select({
      projectId: project.id,
      sectionCount: sql<number>`(select count(*) from ${section} where ${section.projectId} = ${project.id})`,
      maxOrder: sql<number>`(select coalesce(max(${section.order}), -1) from ${section} where ${section.projectId} = ${project.id})`,
    })
    .from(project)
    .where(and(eq(project.id, data.projectId), eq(project.organizationId, orgId)));

  if (!info) {
    return { error: "Project not found" } as const;
  }

  const limits = getPlanLimits();
  if (info.sectionCount >= limits.sectionsPerProject) {
    return { error: "Section limit reached for current plan" } as const;
  }

  const order = data.order ?? (info.maxOrder + 1);
  const id = crypto.randomUUID();
  const now = new Date();
  const [row] = await db
    .insert(section)
    .values({
      id,
      projectId: data.projectId,
      title: data.title,
      order,
      color: data.color ?? null,
      icon: data.icon ?? null,
      open: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  sseManager.broadcast(data.projectId, { type: "invalidate", entity: "sections" });
  logActivity({
    projectId: data.projectId,
    actorId: userId,
    actorName: userName,
    action: "created",
    entity: "section",
    entityId: id,
    description: `Created section "${data.title}"`,
  });

  return row;
}

export async function updateSection(
  orgId: string,
  userId: string,
  userName: string,
  sectionId: string,
  data: { title?: string; order?: number; color?: string | null; icon?: string | null; open?: boolean }
) {
  const [existing] = await db
    .select({ section: section, project: project })
    .from(section)
    .innerJoin(project, eq(section.projectId, project.id))
    .where(and(eq(section.id, sectionId), eq(project.organizationId, orgId)));
  if (!existing) return null;

  const [row] = await db
    .update(section)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(section.id, sectionId))
    .returning();

  sseManager.broadcast(row.projectId, { type: "invalidate", entity: "sections" });
  const changes = [data.title && "title", data.color !== undefined && "color", data.icon !== undefined && "icon", data.order !== undefined && "order"].filter(Boolean).join(", ");
  logActivity({
    projectId: row.projectId,
    actorId: userId,
    actorName: userName,
    action: "updated",
    entity: "section",
    entityId: sectionId,
    description: `Updated section "${row.title}" (${changes || "properties"})`,
  });

  return row;
}

export async function reorderSections(
  orgId: string,
  projectId: string,
  sectionIds: string[]
) {
  if (!(await verifyProjectOrg(projectId, orgId))) return null;

  const now = new Date();
  await db.transaction(async (tx) => {
    for (let i = 0; i < sectionIds.length; i++) {
      await tx
        .update(section)
        .set({ order: i, updatedAt: now })
        .where(and(eq(section.id, sectionIds[i]), eq(section.projectId, projectId)));
    }
  });

  sseManager.broadcast(projectId, { type: "invalidate", entity: "sections" });
  return { success: true };
}

export async function deleteSection(
  orgId: string,
  userId: string,
  userName: string,
  sectionId: string
) {
  const [existing] = await db
    .select({ section: section, project: project })
    .from(section)
    .innerJoin(project, eq(section.projectId, project.id))
    .where(and(eq(section.id, sectionId), eq(project.organizationId, orgId)));
  if (!existing) return null;

  const projectId = existing.section.projectId;
  await db.delete(section).where(eq(section.id, sectionId));

  // Re-normalize remaining section orders to be contiguous
  const remaining = await db
    .select({ id: section.id })
    .from(section)
    .where(eq(section.projectId, projectId))
    .orderBy(asc(section.order));

  const now = new Date();
  for (let i = 0; i < remaining.length; i++) {
    await db
      .update(section)
      .set({ order: i, updatedAt: now })
      .where(eq(section.id, remaining[i].id));
  }

  sseManager.broadcast(projectId, { type: "invalidate", entity: "sections" });
  logActivity({
    projectId: existing.section.projectId,
    actorId: userId,
    actorName: userName,
    action: "deleted",
    entity: "section",
    entityId: sectionId,
    description: `Deleted section "${existing.section.title}"`,
  });

  return existing.section;
}
