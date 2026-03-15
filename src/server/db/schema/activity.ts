import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { project } from "./projects";
import { user } from "./auth";

export const activityActionEnum = pgEnum("activity_action", [
  "created",
  "updated",
  "deleted",
  "checked",
  "unchecked",
]);

export const activityEntityEnum = pgEnum("activity_entity", [
  "section",
  "item",
  "note",
  "tag",
]);

export const activity = pgTable("activity", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  actorName: text("actor_name").notNull(),
  action: activityActionEnum("action").notNull(),
  entity: activityEntityEnum("entity").notNull(),
  entityId: text("entity_id").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
