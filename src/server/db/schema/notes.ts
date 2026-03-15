import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { item } from "./items";

export const note = pgTable("note", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull().references(() => item.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
