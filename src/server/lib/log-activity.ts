import { db } from "@/server/db";
import { activity } from "@/server/db/schema";

type ActivityAction = "created" | "updated" | "deleted" | "checked" | "unchecked";
type ActivityEntity = "section" | "item" | "note" | "tag";

export async function logActivity(params: {
  projectId: string;
  actorId: string;
  actorName: string;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId: string;
  description: string;
}) {
  await db.insert(activity).values({
    id: crypto.randomUUID(),
    ...params,
    createdAt: new Date(),
  });
}
