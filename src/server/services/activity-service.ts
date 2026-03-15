import { db } from "@/server/db";
import { activity, project } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function getActivity(
  orgId: string,
  projectId: string,
  limit = 50,
  offset = 0
) {
  const [proj] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)));
  if (!proj) return null;

  return db
    .select()
    .from(activity)
    .where(eq(activity.projectId, projectId))
    .orderBy(desc(activity.createdAt))
    .limit(limit)
    .offset(offset);
}
