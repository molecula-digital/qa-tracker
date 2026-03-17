import { db } from "@/server/db";
import { notification, user } from "@/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function createNotification(data: {
  userId: string;
  projectId: string;
  itemId?: string | null;
  type: "assigned" | "item_updated" | "item_checked" | "note_added";
  title: string;
  body: string;
}) {
  const id = crypto.randomUUID();

  // Get user email for mock email
  const [recipient] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, data.userId));

  const [row] = await db.insert(notification).values({
    id,
    userId: data.userId,
    projectId: data.projectId,
    itemId: data.itemId ?? null,
    type: data.type,
    title: data.title,
    body: data.body,
    read: false,
    emailSent: false,
  }).returning();

  // Mock email
  if (recipient) {
    console.log(`[EMAIL MOCK] To: ${recipient.email} (${recipient.name}) | Subject: ${data.title} | Body: ${data.body}`);
    await db.update(notification).set({ emailSent: true }).where(eq(notification.id, id));
  }

  return row;
}

export async function getNotifications(userId: string, limit = 50) {
  return db.select().from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(limit);
}

export async function getUnreadCount(userId: string) {
  const [result] = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(notification)
    .where(and(eq(notification.userId, userId), eq(notification.read, false)));
  return Number(result?.count ?? 0);
}

export async function markRead(userId: string, notificationId: string) {
  await db.update(notification)
    .set({ read: true })
    .where(and(eq(notification.id, notificationId), eq(notification.userId, userId)));
}

export async function markAllRead(userId: string) {
  await db.update(notification)
    .set({ read: true })
    .where(and(eq(notification.userId, userId), eq(notification.read, false)));
}

/** Notify all assignees of an item, excluding the actor */
export async function notifyAssignees(
  itemId: string,
  projectId: string,
  actorId: string,
  type: "assigned" | "item_updated" | "item_checked" | "note_added",
  title: string,
  body: string,
  assigneeIds: string[],
) {
  const recipients = assigneeIds.filter((id) => id !== actorId);
  await Promise.all(
    recipients.map((userId) =>
      createNotification({ userId, projectId, itemId, type, title, body })
    )
  );
}
