import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { project } from "./projects";
import { user } from "./auth";

export const projectLink = pgTable("project_link", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  icon: text("icon").default("link"),
  order: integer("order").default(0).notNull(),
  createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
