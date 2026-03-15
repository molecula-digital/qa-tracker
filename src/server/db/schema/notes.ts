import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { item } from "./items";
import { user } from "./auth";

export const note = pgTable("note", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull().references(() => item.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
