import { Hono } from "hono";
import { db } from "@/server/db";
import { organization } from "@/server/db/schema/auth";
import { project, section, item, itemTag } from "@/server/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";

const publicBoard = new Hono();

// CORS for public endpoints — allow any origin (read-only data)
publicBoard.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type");
  if (c.req.method === "OPTIONS") return c.text("", 204);
  await next();
});

// GET /api/public/board/:orgSlug/:projectSlug
publicBoard.get("/board/:orgSlug/:projectSlug", async (c) => {
  const orgSlug = c.req.param("orgSlug");
  const projectSlug = c.req.param("projectSlug");

  // Look up org by slug
  const [org] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, orgSlug));
  if (!org) return c.json({ error: "Not found" }, 404);

  // Look up public project
  const [proj] = await db
    .select({
      id: project.id,
      name: project.name,
      description: project.description,
      slug: project.slug,
    })
    .from(project)
    .where(
      and(
        eq(project.organizationId, org.id),
        eq(project.slug, projectSlug),
        eq(project.isPublic, true)
      )
    );
  if (!proj) return c.json({ error: "Not found" }, 404);

  // Fetch sections
  const sections = await db
    .select({
      id: section.id,
      title: section.title,
      color: section.color,
      icon: section.icon,
    })
    .from(section)
    .where(eq(section.projectId, proj.id))
    .orderBy(asc(section.order));

  if (sections.length === 0) {
    c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return c.json({
      project: { name: proj.name, description: proj.description, slug: proj.slug },
      sections: [],
    });
  }

  const sectionIds = sections.map((s) => s.id);

  // Fetch items (no notes)
  const items = await db
    .select({
      id: item.id,
      sectionId: item.sectionId,
      text: item.text,
      checked: item.checked,
    })
    .from(item)
    .where(inArray(item.sectionId, sectionIds))
    .orderBy(asc(item.order));

  const itemIds = items.map((i) => i.id);

  // Fetch tags
  const tags =
    itemIds.length > 0
      ? await db
          .select()
          .from(itemTag)
          .where(inArray(itemTag.itemId, itemIds))
      : [];

  // Build lookup maps
  const tagsByItem = new Map<string, string[]>();
  for (const t of tags) {
    const arr = tagsByItem.get(t.itemId) ?? [];
    arr.push(t.tag);
    tagsByItem.set(t.itemId, arr);
  }

  const itemsBySection = new Map<
    string,
    { text: string; checked: boolean; tags: string[] }[]
  >();
  for (const i of items) {
    const arr = itemsBySection.get(i.sectionId) ?? [];
    arr.push({
      text: i.text,
      checked: i.checked,
      tags: tagsByItem.get(i.id) ?? [],
    });
    itemsBySection.set(i.sectionId, arr);
  }

  const result = sections.map((s) => ({
    title: s.title,
    color: s.color ?? undefined,
    icon: s.icon ?? undefined,
    items: itemsBySection.get(s.id) ?? [],
  }));

  c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return c.json({
    project: { name: proj.name, description: proj.description, slug: proj.slug },
    sections: result,
  });
});

export default publicBoard;
