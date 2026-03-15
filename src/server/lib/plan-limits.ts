import { db } from "@/server/db";
import { project, section } from "@/server/db/schema";
import { eq, count } from "drizzle-orm";

const PLAN_LIMITS = {
  free: { projects: 2, sectionsPerProject: Infinity },
  team: { projects: 10, sectionsPerProject: Infinity },
  business: { projects: Infinity, sectionsPerProject: Infinity },
} as const;

type PlanName = keyof typeof PLAN_LIMITS;

export async function canCreateProject(orgId: string, plan: PlanName = "free") {
  const [result] = await db
    .select({ count: count() })
    .from(project)
    .where(eq(project.organizationId, orgId));
  return result.count < PLAN_LIMITS[plan].projects;
}

export async function canCreateSection(
  projectId: string,
  plan: PlanName = "free"
) {
  const [result] = await db
    .select({ count: count() })
    .from(section)
    .where(eq(section.projectId, projectId));
  return result.count < PLAN_LIMITS[plan].sectionsPerProject;
}

export function getPlanLimits(plan: PlanName = "free") {
  return PLAN_LIMITS[plan];
}
