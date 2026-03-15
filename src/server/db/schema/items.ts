import { pgTable, text, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { section } from "./sections";

export const tagEnum = pgEnum("tag", ["bug", "question", "later"]);

export const item = pgTable("item", {
  id: text("id").primaryKey(),
  sectionId: text("section_id").notNull().references(() => section.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  checked: boolean("checked").notNull().default(false),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const itemTag = pgTable("item_tag", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull().references(() => item.id, { onDelete: "cascade" }),
  tag: tagEnum("tag").notNull(),
});
