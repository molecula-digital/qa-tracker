import { pgTable, text, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    slug: text("slug").notNull(),
    isPublic: boolean("is_public").default(false).notNull(),
    organizationId: text("organization_id").notNull(),
    createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("project_org_slug_uidx").on(table.organizationId, table.slug),
  ]
);
