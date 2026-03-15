import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { project } from "./projects";

export const section = pgTable("section", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => project.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order").notNull().default(0),
  color: text("color"),
  icon: text("icon"),
  open: boolean("open").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
