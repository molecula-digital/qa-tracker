import { pgTable, text, timestamp, boolean, pgEnum, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { project } from "./projects";
import { item } from "./items";

export const notificationTypeEnum = pgEnum("notification_type", [
  "assigned", "item_updated", "item_checked", "note_added",
]);

export const notification = pgTable("notification", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull().references(() => project.id, { onDelete: "cascade" }),
  itemId: text("item_id").references(() => item.id, { onDelete: "set null" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  emailSent: boolean("email_sent").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("notification_user_idx").on(t.userId, t.read, t.createdAt),
]);
