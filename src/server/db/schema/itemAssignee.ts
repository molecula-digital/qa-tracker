import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { item } from "./items";
import { user } from "./auth";

export const itemAssignee = pgTable("item_assignee", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull().references(() => item.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (t) => [
  unique().on(t.itemId, t.userId),
]);
