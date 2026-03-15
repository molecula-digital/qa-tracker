import { db } from "@/server/db";
import { project, section, item, activity } from "@/server/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { canCreateProject } from "@/server/lib/plan-limits";
import { logActivity } from "@/server/lib/log-activity";
import { slugify, slugifyWithSuffix } from "@/lib/slugify";

export async function listProjects(orgId: string) {
  return db
    .select()
    .from(project)
    .where(eq(project.organizationId, orgId))
    .orderBy(project.createdAt);
}

export async function getProject(orgId: string, projectId: string) {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)));
  return row ?? null;
}

export async function createProject(
  orgId: string,
  userId: string,
  userName: string,
  data: { name: string; description?: string }
) {
  const allowed = await canCreateProject(orgId);
  if (!allowed) {
    return { error: "Project limit reached for current plan" } as const;
  }

  // Generate slug from name with collision retry
  let slug = slugify(data.name);
  let slugAvailable = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    const [existing] = await db
      .select({ id: project.id })
      .from(project)
      .where(and(eq(project.organizationId, orgId), eq(project.slug, slug)));
    if (!existing) { slugAvailable = true; break; }
    slug = slugifyWithSuffix(data.name);
  }
  if (!slugAvailable) {
    return { error: "Could not generate unique slug" } as const;
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const [row] = await db
    .insert(project)
    .values({
      id,
      name: data.name,
      description: data.description ?? null,
      slug,
      organizationId: orgId,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logActivity({
    projectId: id,
    actorId: userId,
    actorName: userName,
    action: "created",
    entity: "section",
    entityId: id,
    description: `Created project "${data.name}"`,
  });

  return row;
}

export async function updateProject(
  orgId: string,
  userId: string,
  userName: string,
  projectId: string,
  data: { name?: string; description?: string; isPublic?: boolean; slug?: string }
) {
  // Check slug uniqueness if slug is being changed
  if (data.slug) {
    const [existing] = await db
      .select({ id: project.id })
      .from(project)
      .where(
        and(
          eq(project.organizationId, orgId),
          eq(project.slug, data.slug),
        )
      );
    if (existing && existing.id !== projectId) {
      return { error: "Slug already in use" } as const;
    }
  }

  const [row] = await db
    .update(project)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)))
    .returning();
  if (!row) return null;

  logActivity({
    projectId,
    actorId: userId,
    actorName: userName,
    action: "updated",
    entity: "section",
    entityId: projectId,
    description: `Updated project "${row.name}"`,
  });

  return row;
}

export async function deleteProject(
  orgId: string,
  userId: string,
  userName: string,
  projectId: string
) {
  const [row] = await db
    .delete(project)
    .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)))
    .returning();
  if (!row) return null;

  logActivity({
    projectId,
    actorId: userId,
    actorName: userName,
    action: "deleted",
    entity: "section",
    entityId: projectId,
    description: `Deleted project "${row.name}"`,
  });

  return row;
}

export async function getProjectStats(orgId: string) {
  const orgProjects = await db
    .select()
    .from(project)
    .where(eq(project.organizationId, orgId))
    .orderBy(project.updatedAt);

  if (orgProjects.length === 0) return [];

  const projectIds = orgProjects.map((p) => p.id);

  const statsRows = await db
    .select({
      projectId: section.projectId,
      sectionCount: sql<number>`count(distinct ${section.id})`.as("section_count"),
      itemCount: sql<number>`count(distinct ${item.id})`.as("item_count"),
      doneCount: sql<number>`count(distinct case when ${item.checked} = true then ${item.id} end)`.as("done_count"),
    })
    .from(section)
    .leftJoin(item, eq(item.sectionId, section.id))
    .where(sql`${section.projectId} in ${projectIds}`)
    .groupBy(section.projectId);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activityRows = await db
    .select({
      projectId: activity.projectId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(activity)
    .where(
      and(
        sql`${activity.projectId} in ${projectIds}`,
        gte(activity.createdAt, sevenDaysAgo)
      )
    )
    .groupBy(activity.projectId);

  const statsMap = new Map(statsRows.map((r) => [r.projectId, r]));
  const activityMap = new Map(activityRows.map((r) => [r.projectId, Number(r.count)]));

  return orgProjects.map((p) => {
    const s = statsMap.get(p.id);
    return {
      ...p,
      sectionCount: Number(s?.sectionCount ?? 0),
      itemCount: Number(s?.itemCount ?? 0),
      doneCount: Number(s?.doneCount ?? 0),
      recentActivityCount: activityMap.get(p.id) ?? 0,
    };
  });
}
