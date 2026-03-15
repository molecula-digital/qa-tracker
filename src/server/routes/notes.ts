import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/server/db";
import { note, item, section, project } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import { sseManager } from "@/server/lib/sse-manager";

const notes = new Hono<OrgEnv>();

notes.use("*", requireOrg);

/** Get projectId from an itemId (item -> section -> project) */
async function getProjectIdFromItem(itemId: string): Promise<string | null> {
  const [row] = await db
    .select({ projectId: section.projectId })
    .from(item)
    .innerJoin(section, eq(item.sectionId, section.id))
    .where(eq(item.id, itemId));
  return row?.projectId ?? null;
}

/** Verify an item belongs to the current org (item -> section -> project -> org) */
async function verifyItemOrg(itemId: string, orgId: string) {
  const [row] = await db
    .select({ item: item, section: section, project: project })
    .from(item)
    .innerJoin(section, eq(item.sectionId, section.id))
    .innerJoin(project, eq(section.projectId, project.id))
    .where(and(eq(item.id, itemId), eq(project.organizationId, orgId)));
  return row ?? null;
}

// List notes for an item
notes.get(
  "/",
  zValidator("query", z.object({ itemId: z.string().min(1) })),
  async (c) => {
    const orgId = c.get("organizationId");
    const { itemId } = c.req.valid("query");

    if (!(await verifyItemOrg(itemId, orgId))) {
      return c.json({ error: "Item not found" }, 404);
    }

    const rows = await db
      .select()
      .from(note)
      .where(eq(note.itemId, itemId))
      .orderBy(note.createdAt);
    return c.json(rows);
  }
);

// Create note
notes.post(
  "/",
  zValidator(
    "json",
    z.object({
      itemId: z.string().min(1),
      text: z.string().min(1).max(2000),
    })
  ),
  async (c) => {
    const orgId = c.get("organizationId");
    const user = c.get("user");
    const body = c.req.valid("json");

    if (!(await verifyItemOrg(body.itemId, orgId))) {
      return c.json({ error: "Item not found" }, 404);
    }

    const id = crypto.randomUUID();
    const [row] = await db
      .insert(note)
      .values({
        id,
        itemId: body.itemId,
        text: body.text,
        createdBy: user.id,
        createdAt: new Date(),
      })
      .returning();
    const projectId = await getProjectIdFromItem(body.itemId);
    if (projectId) sseManager.broadcast(projectId, { type: "invalidate", entity: "notes" });
    return c.json(row, 201);
  }
);

// Delete note
notes.delete("/:id", async (c) => {
  const orgId = c.get("organizationId");
  const id = c.req.param("id");

  const [existing] = await db.select().from(note).where(eq(note.id, id));
  if (!existing) return c.json({ error: "Not found" }, 404);

  // Verify the note's item belongs to org
  if (!(await verifyItemOrg(existing.itemId, orgId))) {
    return c.json({ error: "Not found" }, 404);
  }

  await db.delete(note).where(eq(note.id, id));
  const projectId = await getProjectIdFromItem(existing.itemId);
  if (projectId) sseManager.broadcast(projectId, { type: "invalidate", entity: "notes" });
  return c.json({ success: true });
});

export default notes;
