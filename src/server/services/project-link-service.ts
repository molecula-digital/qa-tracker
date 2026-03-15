import { db } from "@/server/db";
import { projectLink, project } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { sseManager } from "@/server/lib/sse-manager";

async function verifyProjectOrg(projectId: string, orgId: string) {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)));
  return row ?? null;
}

export async function listLinks(orgId: string, projectId: string) {
  if (!(await verifyProjectOrg(projectId, orgId))) return null;

  return db
    .select()
    .from(projectLink)
    .where(eq(projectLink.projectId, projectId))
    .orderBy(projectLink.order);
}

export async function createLink(
  orgId: string,
  userId: string,
  data: { projectId: string; title: string; url: string; icon?: string }
) {
  if (!(await verifyProjectOrg(data.projectId, orgId))) {
    return { error: "Project not found" } as const;
  }

  const id = crypto.randomUUID();
  const [row] = await db
    .insert(projectLink)
    .values({
      id,
      projectId: data.projectId,
      title: data.title,
      url: data.url,
      icon: data.icon ?? "link",
      createdBy: userId,
      createdAt: new Date(),
    })
    .returning();

  sseManager.broadcast(data.projectId, { type: "invalidate", entity: "project-links" });
  return row;
}

export async function updateLink(
  orgId: string,
  linkId: string,
  data: { title?: string; url?: string; icon?: string }
) {
  const [existing] = await db.select().from(projectLink).where(eq(projectLink.id, linkId));
  if (!existing) return null;

  if (!(await verifyProjectOrg(existing.projectId, orgId))) return null;

  const [row] = await db
    .update(projectLink)
    .set(data)
    .where(eq(projectLink.id, linkId))
    .returning();

  sseManager.broadcast(existing.projectId, { type: "invalidate", entity: "project-links" });
  return row;
}

export async function deleteLink(orgId: string, linkId: string) {
  const [existing] = await db.select().from(projectLink).where(eq(projectLink.id, linkId));
  if (!existing) return null;

  if (!(await verifyProjectOrg(existing.projectId, orgId))) return null;

  await db.delete(projectLink).where(eq(projectLink.id, linkId));
  sseManager.broadcast(existing.projectId, { type: "invalidate", entity: "project-links" });
  return existing;
}
