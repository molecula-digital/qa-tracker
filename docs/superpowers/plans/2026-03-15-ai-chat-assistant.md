# AI Chat Assistant Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating AI chat assistant to the Retrack dashboard that can perform all CRUD operations on projects, sections, items, notes, tags, and project links via natural language.

**Architecture:** Extract DB logic from Hono routes into a shared service layer, define 23 AI tools backed by those services, expose them via an AI SDK `streamText` chat route, and render a floating chat widget on all dashboard pages.

**Tech Stack:** AI SDK v5 (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`), OpenAI gpt-4o-mini, Hono, Drizzle ORM, React, Tailwind/shadcn

**Spec:** `docs/superpowers/specs/2026-03-15-ai-chat-assistant-design.md`

---

## Chunk 1: Dependencies & Service Layer

### Task 1: Install AI SDK dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
pnpm add ai @ai-sdk/react @ai-sdk/openai
```

- [ ] **Step 2: Verify installation**

```bash
pnpm ls ai @ai-sdk/react @ai-sdk/openai
```

Expected: All three packages listed with versions.

- [ ] **Step 3: Add OPENAI_API_KEY to .env.local**

Add to `.env.local`:
```
OPENAI_API_KEY=your-key-here
```

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add AI SDK dependencies (ai, @ai-sdk/react, @ai-sdk/openai)"
```

---

### Task 2: Project service

Extract project DB logic from `src/server/routes/projects.ts` into a standalone service.

**Files:**
- Create: `src/server/services/project-service.ts`
- Modify: `src/server/routes/projects.ts`

- [ ] **Step 1: Create project-service.ts**

```ts
// src/server/services/project-service.ts
import { db } from "@/server/db";
import { project, section, item, activity } from "@/server/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { canCreateProject } from "@/server/lib/plan-limits";
import { logActivity } from "@/server/lib/log-activity";

export async function listProjects(orgId: string) {
  return db
    .select()
    .from(project)
    .where(eq(project.organizationId, orgId))
    .orderBy(project.createdAt);
}

export async function getProject(orgId: string, projectId: string) {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)));
  return row ?? null;
}

export async function createProject(
  orgId: string,
  userId: string,
  userName: string,
  data: { name: string; description?: string }
) {
  const allowed = await canCreateProject(orgId);
  if (!allowed) {
    return { error: "Project limit reached for current plan" } as const;
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const [row] = await db
    .insert(project)
    .values({
      id,
      name: data.name,
      description: data.description ?? null,
      organizationId: orgId,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logActivity({
    projectId: id,
    actorId: userId,
    actorName: userName,
    action: "created",
    entity: "section", // reuse closest entity type
    entityId: id,
    description: `Created project "${data.name}"`,
  });

  return row;
}

export async function updateProject(
  orgId: string,
  userId: string,
  userName: string,
  projectId: string,
  data: { name?: string; description?: string }
) {
  const [row] = await db
    .update(project)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)))
    .returning();
  if (!row) return null;

  logActivity({
    projectId,
    actorId: userId,
    actorName: userName,
    action: "updated",
    entity: "section",
    entityId: projectId,
    description: `Updated project "${row.name}"`,
  });

  return row;
}

export async function deleteProject(
  orgId: string,
  userId: string,
  userName: string,
  projectId: string
) {
  const [row] = await db
    .delete(project)
    .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)))
    .returning();
  if (!row) return null;

  logActivity({
    projectId,
    actorId: userId,
    actorName: userName,
    action: "deleted",
    entity: "section",
    entityId: projectId,
    description: `Deleted project "${row.name}"`,
  });

  return row;
}

export async function getProjectStats(orgId: string) {
  const orgProjects = await db
    .select()
    .from(project)
    .where(eq(project.organizationId, orgId))
    .orderBy(project.updatedAt);

  if (orgProjects.length === 0) return [];

  const projectIds = orgProjects.map((p) => p.id);

  const statsRows = await db
    .select({
      projectId: section.projectId,
      sectionCount: sql<number>`count(distinct ${section.id})`.as("section_count"),
      itemCount: sql<number>`count(distinct ${item.id})`.as("item_count"),
      doneCount: sql<number>`count(distinct case when ${item.checked} = true then ${item.id} end)`.as("done_count"),
    })
    .from(section)
    .leftJoin(item, eq(item.sectionId, section.id))
    .where(sql`${section.projectId} in ${projectIds}`)
    .groupBy(section.projectId);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activityRows = await db
    .select({
      projectId: activity.projectId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(activity)
    .where(
      and(
        sql`${activity.projectId} in ${projectIds}`,
        gte(activity.createdAt, sevenDaysAgo)
      )
    )
    .groupBy(activity.projectId);

  const statsMap = new Map(statsRows.map((r) => [r.projectId, r]));
  const activityMap = new Map(activityRows.map((r) => [r.projectId, Number(r.count)]));

  return orgProjects.map((p) => {
    const s = statsMap.get(p.id);
    return {
      ...p,
      sectionCount: Number(s?.sectionCount ?? 0),
      itemCount: Number(s?.itemCount ?? 0),
      doneCount: Number(s?.doneCount ?? 0),
      recentActivityCount: activityMap.get(p.id) ?? 0,
    };
  });
}
```

- [ ] **Step 2: Refactor projects route to use service**

Replace `src/server/routes/projects.ts` — keep the Hono route structure but call service functions instead of inline DB queries. Remove the SSE broadcasts for project mutations (they broadcast on `orgId` which no client subscribes to).

```ts
// src/server/routes/projects.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import { sseManager } from "@/server/lib/sse-manager";
import * as projectService from "@/server/services/project-service";

const projects = new Hono<OrgEnv>();

projects.use("*", requireOrg);

projects.get("/", async (c) => {
  const rows = await projectService.listProjects(c.get("organizationId"));
  return c.json(rows);
});

projects.get("/stats", async (c) => {
  const result = await projectService.getProjectStats(c.get("organizationId"));
  return c.json(result);
});

projects.get("/:id", async (c) => {
  const row = await projectService.getProject(c.get("organizationId"), c.req.param("id"));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

projects.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
    const result = await projectService.createProject(
      c.get("organizationId"),
      user.id,
      user.name ?? user.email,
      body
    );
    if ("error" in result) return c.json(result, 403);
    sseManager.broadcast(c.get("organizationId"), { type: "invalidate", entity: "projects" });
    return c.json(result, 201);
  }
);

projects.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const row = await projectService.updateProject(
      c.get("organizationId"),
      user.id,
      user.name ?? user.email,
      c.req.param("id"),
      c.req.valid("json")
    );
    if (!row) return c.json({ error: "Not found" }, 404);
    sseManager.broadcast(c.get("organizationId"), { type: "invalidate", entity: "projects" });
    return c.json(row);
  }
);

projects.delete("/:id", async (c) => {
  const user = c.get("user");
  const row = await projectService.deleteProject(
    c.get("organizationId"),
    user.id,
    user.name ?? user.email,
    c.req.param("id")
  );
  if (!row) return c.json({ error: "Not found" }, 404);
  sseManager.broadcast(c.get("organizationId"), { type: "invalidate", entity: "projects" });
  return c.json({ success: true });
});

export default projects;
```

- [ ] **Step 3: Verify the app builds**

```bash
pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/server/services/project-service.ts src/server/routes/projects.ts
git commit -m "refactor: extract project service layer"
```

---

### Task 3: Section service

**Files:**
- Create: `src/server/services/section-service.ts`
- Modify: `src/server/routes/sections.ts`

- [ ] **Step 1: Create section-service.ts**

```ts
// src/server/services/section-service.ts
import { db } from "@/server/db";
import { section, item, project } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { canCreateSection } from "@/server/lib/plan-limits";
import { sseManager } from "@/server/lib/sse-manager";
import { logActivity } from "@/server/lib/log-activity";

/** Verify project belongs to org, return project or null */
export async function verifyProjectOrg(projectId: string, orgId: string) {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)));
  return row ?? null;
}

export async function listSections(orgId: string, projectId: string) {
  if (!(await verifyProjectOrg(projectId, orgId))) return null;

  const sections = await db
    .select()
    .from(section)
    .where(eq(section.projectId, projectId))
    .orderBy(section.order);

  // Get item counts per section
  const sectionIds = sections.map((s) => s.id);
  if (sectionIds.length === 0) return sections.map((s) => ({ ...s, itemCount: 0 }));

  const countRows = await db
    .select({
      sectionId: item.sectionId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(item)
    .where(sql`${item.sectionId} in ${sectionIds}`)
    .groupBy(item.sectionId);

  const countMap = new Map(countRows.map((r) => [r.sectionId, Number(r.count)]));

  return sections.map((s) => ({
    ...s,
    itemCount: countMap.get(s.id) ?? 0,
  }));
}

export async function createSection(
  orgId: string,
  userId: string,
  userName: string,
  data: { projectId: string; title: string; order?: number; color?: string; icon?: string }
) {
  if (!(await verifyProjectOrg(data.projectId, orgId))) {
    return { error: "Project not found" } as const;
  }

  const allowed = await canCreateSection(data.projectId);
  if (!allowed) {
    return { error: "Section limit reached for current plan" } as const;
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const [row] = await db
    .insert(section)
    .values({
      id,
      projectId: data.projectId,
      title: data.title,
      order: data.order ?? 0,
      color: data.color ?? null,
      icon: data.icon ?? null,
      open: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  sseManager.broadcast(data.projectId, { type: "invalidate", entity: "sections" });
  logActivity({
    projectId: data.projectId,
    actorId: userId,
    actorName: userName,
    action: "created",
    entity: "section",
    entityId: id,
    description: `Created section "${data.title}"`,
  });

  return row;
}

export async function updateSection(
  orgId: string,
  userId: string,
  userName: string,
  sectionId: string,
  data: { title?: string; order?: number; color?: string | null; icon?: string | null; open?: boolean }
) {
  const [existing] = await db
    .select({ section: section, project: project })
    .from(section)
    .innerJoin(project, eq(section.projectId, project.id))
    .where(and(eq(section.id, sectionId), eq(project.organizationId, orgId)));
  if (!existing) return null;

  const [row] = await db
    .update(section)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(section.id, sectionId))
    .returning();

  sseManager.broadcast(row.projectId, { type: "invalidate", entity: "sections" });
  const changes = [data.title && "title", data.color !== undefined && "color", data.icon !== undefined && "icon", data.order !== undefined && "order"].filter(Boolean).join(", ");
  logActivity({
    projectId: row.projectId,
    actorId: userId,
    actorName: userName,
    action: "updated",
    entity: "section",
    entityId: sectionId,
    description: `Updated section "${row.title}" (${changes || "properties"})`,
  });

  return row;
}

export async function deleteSection(
  orgId: string,
  userId: string,
  userName: string,
  sectionId: string
) {
  const [existing] = await db
    .select({ section: section, project: project })
    .from(section)
    .innerJoin(project, eq(section.projectId, project.id))
    .where(and(eq(section.id, sectionId), eq(project.organizationId, orgId)));
  if (!existing) return null;

  await db.delete(section).where(eq(section.id, sectionId));

  sseManager.broadcast(existing.section.projectId, { type: "invalidate", entity: "sections" });
  logActivity({
    projectId: existing.section.projectId,
    actorId: userId,
    actorName: userName,
    action: "deleted",
    entity: "section",
    entityId: sectionId,
    description: `Deleted section "${existing.section.title}"`,
  });

  return existing.section;
}
```

- [ ] **Step 2: Refactor sections route to use service**

```ts
// src/server/routes/sections.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import * as sectionService from "@/server/services/section-service";

const sections = new Hono<OrgEnv>();

sections.use("*", requireOrg);

sections.get(
  "/",
  zValidator("query", z.object({ projectId: z.string().min(1) })),
  async (c) => {
    const result = await sectionService.listSections(
      c.get("organizationId"),
      c.req.valid("query").projectId
    );
    if (result === null) return c.json({ error: "Project not found" }, 404);
    return c.json(result);
  }
);

sections.post(
  "/",
  zValidator(
    "json",
    z.object({
      projectId: z.string().min(1),
      title: z.string().min(1).max(100),
      order: z.number().int().optional(),
      color: z.string().max(20).optional(),
      icon: z.string().max(50).optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const result = await sectionService.createSection(
      c.get("organizationId"),
      user.id,
      user.name ?? user.email,
      c.req.valid("json")
    );
    if ("error" in result) {
      const status = result.error.includes("limit") ? 403 : 404;
      return c.json(result, status);
    }
    return c.json(result, 201);
  }
);

sections.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      title: z.string().min(1).max(100).optional(),
      order: z.number().int().optional(),
      color: z.string().max(20).nullable().optional(),
      icon: z.string().max(50).nullable().optional(),
      open: z.boolean().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const row = await sectionService.updateSection(
      c.get("organizationId"),
      user.id,
      user.name ?? user.email,
      c.req.param("id"),
      c.req.valid("json")
    );
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  }
);

sections.delete("/:id", async (c) => {
  const user = c.get("user");
  const row = await sectionService.deleteSection(
    c.get("organizationId"),
    user.id,
    user.name ?? user.email,
    c.req.param("id")
  );
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

export default sections;
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/server/services/section-service.ts src/server/routes/sections.ts
git commit -m "refactor: extract section service layer"
```

---

### Task 4: Item service

**Files:**
- Create: `src/server/services/item-service.ts`
- Modify: `src/server/routes/items.ts`

- [ ] **Step 1: Create item-service.ts**

```ts
// src/server/services/item-service.ts
import { db } from "@/server/db";
import { item, itemTag, section, project } from "@/server/db/schema";
import { eq, and, inArray, sql, ilike } from "drizzle-orm";
import { sseManager } from "@/server/lib/sse-manager";
import { logActivity } from "@/server/lib/log-activity";

/** Get projectId from a sectionId */
async function getProjectId(sectionId: string): Promise<string | null> {
  const [s] = await db
    .select({ projectId: section.projectId })
    .from(section)
    .where(eq(section.id, sectionId));
  return s?.projectId ?? null;
}

/** Verify a section belongs to the given org */
async function verifySectionOrg(sectionId: string, orgId: string) {
  const [row] = await db
    .select({ section: section, project: project })
    .from(section)
    .innerJoin(project, eq(section.projectId, project.id))
    .where(and(eq(section.id, sectionId), eq(project.organizationId, orgId)));
  return row ?? null;
}

export async function listItems(orgId: string, sectionId: string) {
  if (!(await verifySectionOrg(sectionId, orgId))) return null;

  const rows = await db
    .select()
    .from(item)
    .where(eq(item.sectionId, sectionId))
    .orderBy(item.order);

  const itemIds = rows.map((r) => r.id);
  const tags =
    itemIds.length > 0
      ? await db.select().from(itemTag).where(inArray(itemTag.itemId, itemIds))
      : [];

  const tagsByItem = new Map<string, string[]>();
  for (const t of tags) {
    const arr = tagsByItem.get(t.itemId) ?? [];
    arr.push(t.tag);
    tagsByItem.set(t.itemId, arr);
  }

  return rows.map((r) => ({ ...r, tags: tagsByItem.get(r.id) ?? [] }));
}

export async function createItem(
  orgId: string,
  userId: string,
  userName: string,
  data: { sectionId: string; text: string; order?: number }
) {
  if (!(await verifySectionOrg(data.sectionId, orgId))) {
    return { error: "Section not found" } as const;
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const [row] = await db
    .insert(item)
    .values({
      id,
      sectionId: data.sectionId,
      text: data.text,
      checked: false,
      order: data.order ?? 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const projectId = await getProjectId(data.sectionId);
  if (projectId) {
    sseManager.broadcast(projectId, { type: "invalidate", entity: "items" });
    logActivity({
      projectId,
      actorId: userId,
      actorName: userName,
      action: "created",
      entity: "item",
      entityId: id,
      description: `Added item "${data.text}"`,
    });
  }

  return { ...row, tags: [] };
}

export async function updateItem(
  orgId: string,
  userId: string,
  userName: string,
  itemId: string,
  data: { text?: string; checked?: boolean; order?: number; sectionId?: string }
) {
  const [existing] = await db.select().from(item).where(eq(item.id, itemId));
  if (!existing) return null;

  if (!(await verifySectionOrg(existing.sectionId, orgId))) return null;

  if (data.sectionId && data.sectionId !== existing.sectionId) {
    if (!(await verifySectionOrg(data.sectionId, orgId))) return null;
  }

  const [row] = await db
    .update(item)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(item.id, itemId))
    .returning();

  const projectId = await getProjectId(row.sectionId);
  if (projectId) {
    sseManager.broadcast(projectId, { type: "invalidate", entity: "items" });
    const action =
      data.checked !== undefined
        ? data.checked
          ? "checked"
          : "unchecked"
        : "updated";
    logActivity({
      projectId,
      actorId: userId,
      actorName: userName,
      action: action as "checked" | "unchecked" | "updated",
      entity: "item",
      entityId: itemId,
      description:
        action === "checked"
          ? `Checked off "${existing.text}"`
          : action === "unchecked"
            ? `Unchecked "${existing.text}"`
            : `Updated item "${row.text}"`,
    });
  }

  return row;
}

export async function deleteItem(
  orgId: string,
  userId: string,
  userName: string,
  itemId: string
) {
  const [existing] = await db.select().from(item).where(eq(item.id, itemId));
  if (!existing) return null;

  if (!(await verifySectionOrg(existing.sectionId, orgId))) return null;

  await db.delete(item).where(eq(item.id, itemId));

  const projectId = await getProjectId(existing.sectionId);
  if (projectId) {
    sseManager.broadcast(projectId, { type: "invalidate", entity: "items" });
    logActivity({
      projectId,
      actorId: userId,
      actorName: userName,
      action: "deleted",
      entity: "item",
      entityId: itemId,
      description: `Deleted item "${existing.text}"`,
    });
  }

  return existing;
}

export async function setItemTags(
  orgId: string,
  userId: string,
  userName: string,
  itemId: string,
  tags: ("bug" | "question" | "later")[]
) {
  const [existing] = await db.select().from(item).where(eq(item.id, itemId));
  if (!existing) return null;

  if (!(await verifySectionOrg(existing.sectionId, orgId))) return null;

  await db.delete(itemTag).where(eq(itemTag.itemId, itemId));
  if (tags.length > 0) {
    await db.insert(itemTag).values(
      tags.map((tag) => ({
        id: crypto.randomUUID(),
        itemId,
        tag,
      }))
    );
  }

  const projectId = await getProjectId(existing.sectionId);
  if (projectId) {
    sseManager.broadcast(projectId, { type: "invalidate", entity: "items" });
    logActivity({
      projectId,
      actorId: userId,
      actorName: userName,
      action: "updated",
      entity: "tag",
      entityId: itemId,
      description:
        tags.length > 0
          ? `Set tags [${tags.join(", ")}] on "${existing.text}"`
          : `Cleared tags on "${existing.text}"`,
    });
  }

  return { tags };
}

export async function searchItems(
  orgId: string,
  query: string,
  projectId?: string
) {
  // Search items by text with ILIKE, returning item + section title + project name
  const rows = await db
    .select({
      id: item.id,
      text: item.text,
      checked: item.checked,
      sectionId: item.sectionId,
      sectionTitle: section.title,
      projectId: project.id,
      projectName: project.name,
    })
    .from(item)
    .innerJoin(section, eq(item.sectionId, section.id))
    .innerJoin(project, eq(section.projectId, project.id))
    .where(
      and(
        eq(project.organizationId, orgId),
        ilike(item.text, `%${query}%`),
        ...(projectId ? [eq(project.id, projectId)] : [])
      )
    )
    .limit(20);

  return rows;
}
```

- [ ] **Step 2: Refactor items route to use service**

```ts
// src/server/routes/items.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import * as itemService from "@/server/services/item-service";

const items = new Hono<OrgEnv>();

items.use("*", requireOrg);

items.get(
  "/",
  zValidator("query", z.object({ sectionId: z.string().min(1) })),
  async (c) => {
    const result = await itemService.listItems(
      c.get("organizationId"),
      c.req.valid("query").sectionId
    );
    if (result === null) return c.json({ error: "Section not found" }, 404);
    return c.json(result);
  }
);

items.post(
  "/",
  zValidator(
    "json",
    z.object({
      sectionId: z.string().min(1),
      text: z.string().min(1).max(500),
      order: z.number().int().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const result = await itemService.createItem(
      c.get("organizationId"),
      user.id,
      user.name ?? user.email,
      c.req.valid("json")
    );
    if ("error" in result) return c.json(result, 404);
    return c.json(result, 201);
  }
);

items.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      text: z.string().min(1).max(500).optional(),
      checked: z.boolean().optional(),
      order: z.number().int().optional(),
      sectionId: z.string().min(1).optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const row = await itemService.updateItem(
      c.get("organizationId"),
      user.id,
      user.name ?? user.email,
      c.req.param("id"),
      c.req.valid("json")
    );
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  }
);

items.delete("/:id", async (c) => {
  const user = c.get("user");
  const row = await itemService.deleteItem(
    c.get("organizationId"),
    user.id,
    user.name ?? user.email,
    c.req.param("id")
  );
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

items.post(
  "/:id/tags",
  zValidator(
    "json",
    z.object({
      tags: z.array(z.enum(["bug", "question", "later"])),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const result = await itemService.setItemTags(
      c.get("organizationId"),
      user.id,
      user.name ?? user.email,
      c.req.param("id"),
      c.req.valid("json").tags
    );
    if (result === null) return c.json({ error: "Not found" }, 404);
    return c.json(result);
  }
);

export default items;
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/server/services/item-service.ts src/server/routes/items.ts
git commit -m "refactor: extract item service layer"
```

---

### Task 5: Note, board, activity, and project-link services

**Files:**
- Create: `src/server/services/note-service.ts`
- Create: `src/server/services/board-service.ts`
- Create: `src/server/services/activity-service.ts`
- Create: `src/server/services/project-link-service.ts`
- Modify: `src/server/routes/notes.ts`
- Modify: `src/server/routes/board.ts`
- Modify: `src/server/routes/activity.ts`
- Modify: `src/server/routes/project-links.ts`

- [ ] **Step 1: Create note-service.ts**

```ts
// src/server/services/note-service.ts
import { db } from "@/server/db";
import { note, item, section, project } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { sseManager } from "@/server/lib/sse-manager";
import { logActivity } from "@/server/lib/log-activity";

async function getProjectIdFromItem(itemId: string): Promise<string | null> {
  const [row] = await db
    .select({ projectId: section.projectId })
    .from(item)
    .innerJoin(section, eq(item.sectionId, section.id))
    .where(eq(item.id, itemId));
  return row?.projectId ?? null;
}

async function verifyItemOrg(itemId: string, orgId: string) {
  const [row] = await db
    .select({ item: item, section: section, project: project })
    .from(item)
    .innerJoin(section, eq(item.sectionId, section.id))
    .innerJoin(project, eq(section.projectId, project.id))
    .where(and(eq(item.id, itemId), eq(project.organizationId, orgId)));
  return row ?? null;
}

export async function getItemNotes(orgId: string, itemId: string) {
  if (!(await verifyItemOrg(itemId, orgId))) return null;

  return db
    .select()
    .from(note)
    .where(eq(note.itemId, itemId))
    .orderBy(note.createdAt);
}

export async function createNote(
  orgId: string,
  userId: string,
  userName: string,
  data: { itemId: string; text: string }
) {
  if (!(await verifyItemOrg(data.itemId, orgId))) {
    return { error: "Item not found" } as const;
  }

  const id = crypto.randomUUID();
  const [row] = await db
    .insert(note)
    .values({
      id,
      itemId: data.itemId,
      text: data.text,
      createdBy: userId,
      createdAt: new Date(),
    })
    .returning();

  const projectId = await getProjectIdFromItem(data.itemId);
  if (projectId) {
    sseManager.broadcast(projectId, { type: "invalidate", entity: "notes" });
    logActivity({
      projectId,
      actorId: userId,
      actorName: userName,
      action: "created",
      entity: "note",
      entityId: id,
      description: `Added a note on an item`,
    });
  }

  return row;
}

export async function deleteNote(
  orgId: string,
  userId: string,
  userName: string,
  noteId: string
) {
  const [existing] = await db.select().from(note).where(eq(note.id, noteId));
  if (!existing) return null;

  if (!(await verifyItemOrg(existing.itemId, orgId))) return null;

  await db.delete(note).where(eq(note.id, noteId));

  const projectId = await getProjectIdFromItem(existing.itemId);
  if (projectId) {
    sseManager.broadcast(projectId, { type: "invalidate", entity: "notes" });
    logActivity({
      projectId,
      actorId: userId,
      actorName: userName,
      action: "deleted",
      entity: "note",
      entityId: noteId,
      description: `Deleted a note`,
    });
  }

  return existing;
}
```

- [ ] **Step 2: Create board-service.ts**

```ts
// src/server/services/board-service.ts
import { db } from "@/server/db";
import { section, item, itemTag, note, project } from "@/server/db/schema";
import { eq, and, inArray, asc, sql } from "drizzle-orm";

export async function getBoard(orgId: string, projectId: string) {
  const [proj] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)));
  if (!proj) return null;

  const sections = await db
    .select()
    .from(section)
    .where(eq(section.projectId, projectId))
    .orderBy(asc(section.order));

  if (sections.length === 0) return { sections: [] };

  const sectionIds = sections.map((s) => s.id);

  const items = await db
    .select()
    .from(item)
    .where(inArray(item.sectionId, sectionIds))
    .orderBy(asc(item.order));

  const itemIds = items.map((i) => i.id);

  const tags =
    itemIds.length > 0
      ? await db.select().from(itemTag).where(inArray(itemTag.itemId, itemIds))
      : [];

  const notes =
    itemIds.length > 0
      ? await db
          .select()
          .from(note)
          .where(inArray(note.itemId, itemIds))
          .orderBy(asc(note.createdAt))
      : [];

  const tagsByItem = new Map<string, string[]>();
  for (const t of tags) {
    const arr = tagsByItem.get(t.itemId) ?? [];
    arr.push(t.tag);
    tagsByItem.set(t.itemId, arr);
  }

  const notesByItem = new Map<string, { id: string; text: string; ts: number }[]>();
  for (const n of notes) {
    const arr = notesByItem.get(n.itemId) ?? [];
    arr.push({ id: n.id, text: n.text, ts: new Date(n.createdAt).getTime() });
    notesByItem.set(n.itemId, arr);
  }

  const itemsBySection = new Map<string, any[]>();
  for (const i of items) {
    const arr = itemsBySection.get(i.sectionId) ?? [];
    arr.push({
      id: i.id,
      text: i.text,
      checked: i.checked,
      tags: tagsByItem.get(i.id) ?? [],
      notes: notesByItem.get(i.id) ?? [],
    });
    itemsBySection.set(i.sectionId, arr);
  }

  const result = sections.map((s) => ({
    id: s.id,
    title: s.title,
    open: s.open,
    color: s.color ?? undefined,
    icon: s.icon ?? undefined,
    items: itemsBySection.get(s.id) ?? [],
  }));

  return { sections: result };
}

/** Lightweight board for AI — returns noteCount instead of full notes */
export async function getBoardForAI(orgId: string, projectId: string) {
  const [proj] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)));
  if (!proj) return null;

  const sections = await db
    .select()
    .from(section)
    .where(eq(section.projectId, projectId))
    .orderBy(asc(section.order));

  if (sections.length === 0) return { sections: [] };

  const sectionIds = sections.map((s) => s.id);

  const items = await db
    .select()
    .from(item)
    .where(inArray(item.sectionId, sectionIds))
    .orderBy(asc(item.order));

  const itemIds = items.map((i) => i.id);

  const tags =
    itemIds.length > 0
      ? await db.select().from(itemTag).where(inArray(itemTag.itemId, itemIds))
      : [];

  // Only get note counts, not full content
  const noteCounts =
    itemIds.length > 0
      ? await db
          .select({
            itemId: note.itemId,
            count: sql<number>`count(*)`.as("count"),
          })
          .from(note)
          .where(inArray(note.itemId, itemIds))
          .groupBy(note.itemId)
      : [];

  const tagsByItem = new Map<string, string[]>();
  for (const t of tags) {
    const arr = tagsByItem.get(t.itemId) ?? [];
    arr.push(t.tag);
    tagsByItem.set(t.itemId, arr);
  }

  const noteCountMap = new Map(noteCounts.map((n) => [n.itemId, Number(n.count)]));

  const itemsBySection = new Map<string, any[]>();
  for (const i of items) {
    const arr = itemsBySection.get(i.sectionId) ?? [];
    arr.push({
      id: i.id,
      text: i.text,
      checked: i.checked,
      tags: tagsByItem.get(i.id) ?? [],
      noteCount: noteCountMap.get(i.id) ?? 0,
    });
    itemsBySection.set(i.sectionId, arr);
  }

  return {
    sections: sections.map((s) => ({
      id: s.id,
      title: s.title,
      color: s.color ?? undefined,
      icon: s.icon ?? undefined,
      items: itemsBySection.get(s.id) ?? [],
    })),
  };
}
```

- [ ] **Step 3: Create activity-service.ts**

```ts
// src/server/services/activity-service.ts
import { db } from "@/server/db";
import { activity, project } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function getActivity(
  orgId: string,
  projectId: string,
  limit = 50,
  offset = 0
) {
  const [proj] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)));
  if (!proj) return null;

  return db
    .select()
    .from(activity)
    .where(eq(activity.projectId, projectId))
    .orderBy(desc(activity.createdAt))
    .limit(limit)
    .offset(offset);
}
```

- [ ] **Step 4: Create project-link-service.ts**

```ts
// src/server/services/project-link-service.ts
import { db } from "@/server/db";
import { projectLink, project } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { sseManager } from "@/server/lib/sse-manager";

async function verifyProjectOrg(projectId: string, orgId: string) {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.organizationId, orgId)));
  return row ?? null;
}

export async function listLinks(orgId: string, projectId: string) {
  if (!(await verifyProjectOrg(projectId, orgId))) return null;

  return db
    .select()
    .from(projectLink)
    .where(eq(projectLink.projectId, projectId))
    .orderBy(projectLink.order);
}

export async function createLink(
  orgId: string,
  userId: string,
  data: { projectId: string; title: string; url: string; icon?: string }
) {
  if (!(await verifyProjectOrg(data.projectId, orgId))) {
    return { error: "Project not found" } as const;
  }

  const id = crypto.randomUUID();
  const [row] = await db
    .insert(projectLink)
    .values({
      id,
      projectId: data.projectId,
      title: data.title,
      url: data.url,
      icon: data.icon ?? "link",
      createdBy: userId,
      createdAt: new Date(),
    })
    .returning();

  sseManager.broadcast(data.projectId, { type: "invalidate", entity: "project-links" });
  return row;
}

export async function updateLink(
  orgId: string,
  linkId: string,
  data: { title?: string; url?: string; icon?: string }
) {
  const [existing] = await db.select().from(projectLink).where(eq(projectLink.id, linkId));
  if (!existing) return null;

  if (!(await verifyProjectOrg(existing.projectId, orgId))) return null;

  const [row] = await db
    .update(projectLink)
    .set(data)
    .where(eq(projectLink.id, linkId))
    .returning();

  sseManager.broadcast(existing.projectId, { type: "invalidate", entity: "project-links" });
  return row;
}

export async function deleteLink(orgId: string, linkId: string) {
  const [existing] = await db.select().from(projectLink).where(eq(projectLink.id, linkId));
  if (!existing) return null;

  if (!(await verifyProjectOrg(existing.projectId, orgId))) return null;

  await db.delete(projectLink).where(eq(projectLink.id, linkId));
  sseManager.broadcast(existing.projectId, { type: "invalidate", entity: "project-links" });
  return existing;
}
```

- [ ] **Step 5: Refactor notes route**

```ts
// src/server/routes/notes.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import * as noteService from "@/server/services/note-service";

const notes = new Hono<OrgEnv>();

notes.use("*", requireOrg);

notes.get(
  "/",
  zValidator("query", z.object({ itemId: z.string().min(1) })),
  async (c) => {
    const result = await noteService.getItemNotes(
      c.get("organizationId"),
      c.req.valid("query").itemId
    );
    if (result === null) return c.json({ error: "Item not found" }, 404);
    return c.json(result);
  }
);

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
    const user = c.get("user");
    const result = await noteService.createNote(
      c.get("organizationId"),
      user.id,
      user.name ?? user.email,
      c.req.valid("json")
    );
    if ("error" in result) return c.json(result, 404);
    return c.json(result, 201);
  }
);

notes.delete("/:id", async (c) => {
  const user = c.get("user");
  const row = await noteService.deleteNote(
    c.get("organizationId"),
    user.id,
    user.name ?? user.email,
    c.req.param("id")
  );
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

export default notes;
```

- [ ] **Step 6: Refactor board route**

```ts
// src/server/routes/board.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import { getBoard } from "@/server/services/board-service";

const board = new Hono<OrgEnv>();

board.use("*", requireOrg);

board.get(
  "/",
  zValidator("query", z.object({ projectId: z.string().min(1) })),
  async (c) => {
    const result = await getBoard(
      c.get("organizationId"),
      c.req.valid("query").projectId
    );
    if (!result) return c.json({ error: "Project not found" }, 404);
    return c.json(result);
  }
);

export default board;
```

- [ ] **Step 7: Refactor activity route**

```ts
// src/server/routes/activity.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import { getActivity } from "@/server/services/activity-service";

const activityRoute = new Hono<OrgEnv>();

activityRoute.use("*", requireOrg);

activityRoute.get(
  "/",
  zValidator(
    "query",
    z.object({
      projectId: z.string().min(1),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    })
  ),
  async (c) => {
    const { projectId, limit, offset } = c.req.valid("query");
    const result = await getActivity(
      c.get("organizationId"),
      projectId,
      limit,
      offset
    );
    if (result === null) return c.json({ error: "Project not found" }, 404);
    return c.json(result);
  }
);

export default activityRoute;
```

- [ ] **Step 8: Refactor project-links route**

```ts
// src/server/routes/project-links.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import * as linkService from "@/server/services/project-link-service";

const projectLinks = new Hono<OrgEnv>();

projectLinks.use("*", requireOrg);

projectLinks.get(
  "/",
  zValidator("query", z.object({ projectId: z.string().min(1) })),
  async (c) => {
    const result = await linkService.listLinks(
      c.get("organizationId"),
      c.req.valid("query").projectId
    );
    if (result === null) return c.json({ error: "Project not found" }, 404);
    return c.json(result);
  }
);

projectLinks.post(
  "/",
  zValidator(
    "json",
    z.object({
      projectId: z.string().min(1),
      title: z.string().min(1).max(200),
      url: z.string().url().max(2000),
      icon: z.string().max(50).optional(),
    })
  ),
  async (c) => {
    const result = await linkService.createLink(
      c.get("organizationId"),
      c.get("user").id,
      c.req.valid("json")
    );
    if ("error" in result) return c.json(result, 404);
    return c.json(result, 201);
  }
);

projectLinks.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      title: z.string().min(1).max(200).optional(),
      url: z.string().url().max(2000).optional(),
      icon: z.string().max(50).optional(),
    })
  ),
  async (c) => {
    const row = await linkService.updateLink(
      c.get("organizationId"),
      c.req.param("id"),
      c.req.valid("json")
    );
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  }
);

projectLinks.delete("/:id", async (c) => {
  const row = await linkService.deleteLink(
    c.get("organizationId"),
    c.req.param("id")
  );
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

export default projectLinks;
```

- [ ] **Step 9: Verify build**

```bash
pnpm build
```

- [ ] **Step 10: Commit**

```bash
git add src/server/services/ src/server/routes/notes.ts src/server/routes/board.ts src/server/routes/activity.ts src/server/routes/project-links.ts
git commit -m "refactor: extract note, board, activity, and project-link service layers"
```

---

## Chunk 2: AI Tools & Chat Route

### Task 6: AI tools definition

**Files:**
- Create: `src/server/ai/tools.ts`

- [ ] **Step 1: Create tools.ts with all 23 tools**

```ts
// src/server/ai/tools.ts
import { tool } from "ai";
import { z } from "zod";
import * as projectService from "@/server/services/project-service";
import * as sectionService from "@/server/services/section-service";
import * as itemService from "@/server/services/item-service";
import * as noteService from "@/server/services/note-service";
import * as boardService from "@/server/services/board-service";
import * as activityService from "@/server/services/activity-service";
import * as linkService from "@/server/services/project-link-service";

export function createTools(orgId: string, userId: string, userName: string) {
  return {
    listProjects: tool({
      description: "List all projects in the organization",
      inputSchema: z.object({}),
      execute: async () => {
        return projectService.listProjects(orgId);
      },
    }),

    getProjectStats: tool({
      description: "Get project stats with section/item counts and completion percentage",
      inputSchema: z.object({}),
      execute: async () => {
        return projectService.getProjectStats(orgId);
      },
    }),

    createProject: tool({
      description: "Create a new project",
      inputSchema: z.object({
        name: z.string().describe("Project name (1-100 chars)"),
        description: z.string().optional().describe("Project description (max 500 chars)"),
      }),
      execute: async ({ name, description }) => {
        return projectService.createProject(orgId, userId, userName, { name, description });
      },
    }),

    updateProject: tool({
      description: "Update a project's name or description",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID to update"),
        name: z.string().optional().describe("New project name"),
        description: z.string().optional().describe("New project description"),
      }),
      execute: async ({ projectId, name, description }) => {
        const result = await projectService.updateProject(orgId, userId, userName, projectId, { name, description });
        if (!result) return { error: "Project not found" };
        return result;
      },
    }),

    deleteProject: tool({
      description: "Delete a project and all its data. This is irreversible.",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID to delete"),
      }),
      needsApproval: true,
      execute: async ({ projectId }) => {
        const result = await projectService.deleteProject(orgId, userId, userName, projectId);
        if (!result) return { error: "Project not found" };
        return { success: true, deleted: result.name };
      },
    }),

    getBoard: tool({
      description: "Get the full board for a project with sections and items. Notes are returned as counts only — use getItemNotes to read full notes.",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
      }),
      execute: async ({ projectId }) => {
        const result = await boardService.getBoardForAI(orgId, projectId);
        if (!result) return { error: "Project not found" };
        return result;
      },
    }),

    listSections: tool({
      description: "List sections for a project with item counts (lightweight, no items returned)",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
      }),
      execute: async ({ projectId }) => {
        const result = await sectionService.listSections(orgId, projectId);
        if (result === null) return { error: "Project not found" };
        return result;
      },
    }),

    createSection: tool({
      description: "Create a new section (column) in a project",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
        title: z.string().describe("Section title (1-100 chars)"),
        color: z.string().optional().describe("Section color"),
        icon: z.string().optional().describe("Section icon name"),
      }),
      execute: async ({ projectId, title, color, icon }) => {
        return sectionService.createSection(orgId, userId, userName, {
          projectId,
          title,
          color,
          icon,
        });
      },
    }),

    updateSection: tool({
      description: "Update a section's title, color, or icon",
      inputSchema: z.object({
        sectionId: z.string().describe("The section ID to update"),
        title: z.string().optional().describe("New section title"),
        color: z.string().nullable().optional().describe("New section color"),
        icon: z.string().nullable().optional().describe("New section icon"),
      }),
      execute: async ({ sectionId, ...data }) => {
        const result = await sectionService.updateSection(orgId, userId, userName, sectionId, data);
        if (!result) return { error: "Section not found" };
        return result;
      },
    }),

    deleteSection: tool({
      description: "Delete a section and all its items. This is irreversible.",
      inputSchema: z.object({
        sectionId: z.string().describe("The section ID to delete"),
      }),
      needsApproval: true,
      execute: async ({ sectionId }) => {
        const result = await sectionService.deleteSection(orgId, userId, userName, sectionId);
        if (!result) return { error: "Section not found" };
        return { success: true, deleted: result.title };
      },
    }),

    createItem: tool({
      description: "Create a new item (task) in a section",
      inputSchema: z.object({
        sectionId: z.string().describe("The section ID to add the item to"),
        text: z.string().describe("Item text (1-500 chars)"),
      }),
      execute: async ({ sectionId, text }) => {
        return itemService.createItem(orgId, userId, userName, { sectionId, text });
      },
    }),

    updateItem: tool({
      description: "Update an item's text, checked state, order, or move it to another section",
      inputSchema: z.object({
        itemId: z.string().describe("The item ID to update"),
        text: z.string().optional().describe("New item text"),
        checked: z.boolean().optional().describe("Check/uncheck the item"),
        order: z.number().optional().describe("New sort order"),
        sectionId: z.string().optional().describe("Move item to a different section by ID"),
      }),
      execute: async ({ itemId, text, checked, order, sectionId }) => {
        const result = await itemService.updateItem(orgId, userId, userName, itemId, { text, checked, order, sectionId });
        if (!result) return { error: "Item not found" };
        return result;
      },
    }),

    deleteItem: tool({
      description: "Delete an item. This is irreversible.",
      inputSchema: z.object({
        itemId: z.string().describe("The item ID to delete"),
      }),
      needsApproval: true,
      execute: async ({ itemId }) => {
        const result = await itemService.deleteItem(orgId, userId, userName, itemId);
        if (!result) return { error: "Item not found" };
        return { success: true, deleted: result.text };
      },
    }),

    setItemTags: tool({
      description: "Set tags on an item. Replaces all existing tags. Available tags: bug, question, later",
      inputSchema: z.object({
        itemId: z.string().describe("The item ID"),
        tags: z.array(z.enum(["bug", "question", "later"])).describe("Tags to set"),
      }),
      execute: async ({ itemId, tags }) => {
        const result = await itemService.setItemTags(orgId, userId, userName, itemId, tags);
        if (!result) return { error: "Item not found" };
        return result;
      },
    }),

    searchItems: tool({
      description: "Search items by text across a project or all projects. Returns up to 20 results.",
      inputSchema: z.object({
        query: z.string().describe("Search text"),
        projectId: z.string().optional().describe("Limit search to a specific project"),
      }),
      execute: async ({ query, projectId }) => {
        return itemService.searchItems(orgId, query, projectId);
      },
    }),

    getItemNotes: tool({
      description: "Get all notes for a specific item",
      inputSchema: z.object({
        itemId: z.string().describe("The item ID"),
      }),
      execute: async ({ itemId }) => {
        const result = await noteService.getItemNotes(orgId, itemId);
        if (result === null) return { error: "Item not found" };
        return result;
      },
    }),

    createNote: tool({
      description: "Add a note to an item. Notes are immutable — they cannot be edited after creation.",
      inputSchema: z.object({
        itemId: z.string().describe("The item ID to add a note to"),
        text: z.string().describe("Note text (1-2000 chars)"),
      }),
      execute: async ({ itemId, text }) => {
        return noteService.createNote(orgId, userId, userName, { itemId, text });
      },
    }),

    deleteNote: tool({
      description: "Delete a note. This is irreversible.",
      inputSchema: z.object({
        noteId: z.string().describe("The note ID to delete"),
      }),
      needsApproval: true,
      execute: async ({ noteId }) => {
        const result = await noteService.deleteNote(orgId, userId, userName, noteId);
        if (!result) return { error: "Note not found" };
        return { success: true };
      },
    }),

    getActivity: tool({
      description: "Get the activity log for a project, showing recent changes",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
        limit: z.number().optional().describe("Max results (default 20)"),
      }),
      execute: async ({ projectId, limit }) => {
        const result = await activityService.getActivity(orgId, projectId, limit ?? 20);
        if (result === null) return { error: "Project not found" };
        return result;
      },
    }),

    listProjectLinks: tool({
      description: "List external links for a project",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
      }),
      execute: async ({ projectId }) => {
        const result = await linkService.listLinks(orgId, projectId);
        if (result === null) return { error: "Project not found" };
        return result;
      },
    }),

    createProjectLink: tool({
      description: "Add an external link to a project",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
        title: z.string().describe("Link title"),
        url: z.string().describe("Link URL"),
        icon: z.string().optional().describe("Icon name (default: 'link')"),
      }),
      execute: async ({ projectId, title, url, icon }) => {
        return linkService.createLink(orgId, userId, { projectId, title, url, icon });
      },
    }),

    updateProjectLink: tool({
      description: "Update an existing project link",
      inputSchema: z.object({
        linkId: z.string().describe("The link ID to update"),
        title: z.string().optional().describe("New link title"),
        url: z.string().optional().describe("New link URL"),
        icon: z.string().optional().describe("New icon name"),
      }),
      execute: async ({ linkId, ...data }) => {
        const result = await linkService.updateLink(orgId, linkId, data);
        if (!result) return { error: "Link not found" };
        return result;
      },
    }),

    deleteProjectLink: tool({
      description: "Delete a project link. This is irreversible.",
      inputSchema: z.object({
        linkId: z.string().describe("The link ID to delete"),
      }),
      needsApproval: true,
      execute: async ({ linkId }) => {
        const result = await linkService.deleteLink(orgId, linkId);
        if (!result) return { error: "Link not found" };
        return { success: true };
      },
    }),
  };
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/server/ai/tools.ts
git commit -m "feat: define 23 AI tools backed by service layer"
```

---

### Task 7: Chat route

**Files:**
- Create: `src/server/routes/chat.ts`
- Modify: `src/server/app.ts`

- [ ] **Step 1: Create chat route**

```ts
// src/server/routes/chat.ts
import { Hono } from "hono";
import { streamText, UIMessage, convertToModelMessages, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { requireOrg, type OrgEnv } from "@/server/middleware/org";
import { createTools } from "@/server/ai/tools";
import { db } from "@/server/db";
import { organization } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const chat = new Hono<OrgEnv>();

chat.use("*", requireOrg);

// Simple in-memory rate limiter
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 20) return false;

  entry.count++;
  return true;
}

chat.post("/", async (c) => {
  const user = c.get("user");
  const orgId = c.get("organizationId");

  if (!checkRateLimit(user.id)) {
    return c.json({ error: "Rate limit exceeded. Max 20 requests per minute." }, 429);
  }

  const body = await c.req.json();
  const messages: UIMessage[] = body.messages;
  const context: { projectId?: string; route?: string } = body.context ?? {};

  // Get org name for system prompt
  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, orgId));
  const orgName = org?.name ?? "Unknown";

  const systemPrompt = `You are Retrack AI, an assistant for the Retrack release tracker.
You help users manage their projects, sections, items, notes, and links.

Current context:
- Organization: ${orgName}
- Current page: ${context.route ?? "unknown"}
- Active project: ${context.projectId ?? "none"}

When the user refers to "this project" or doesn't specify a project, use the active project ID: ${context.projectId ?? "none"}.
If no project is active and the operation requires one, ask which project.

For destructive actions (deletes), you will ask for user approval before executing.
Notes are immutable — they can be created and deleted but not edited.
Keep responses concise and action-oriented.`;

  const tools = createTools(orgId, user.id, user.name ?? user.email);

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(10),
    maxTokens: 2048,
  });

  return result.toUIMessageStreamResponse();
});

export default chat;
```

- [ ] **Step 2: Register chat route in app.ts**

Add to `src/server/app.ts` after existing imports:

```ts
import chat from "./routes/chat";
```

Add after the last `app.route(...)` line:

```ts
app.route("/chat", chat);
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

Note: If Zod v4 causes issues with AI SDK, check `ai` package docs for Zod v4 compat. May need to use `zod/v3` import or check for an adapter.

- [ ] **Step 4: Commit**

```bash
git add src/server/routes/chat.ts src/server/app.ts
git commit -m "feat: add AI chat route with streamText and 23 tools"
```

---

## Chunk 3: Floating Chat Widget

### Task 8: AiChat component

**Files:**
- Create: `src/components/AiChat.tsx`
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Create the floating chat widget**

```tsx
// src/components/AiChat.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle, X, Square, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AiChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const projectId = pathname.match(/\/dashboard\/projects\/([^/]+)/)?.[1];

  const { messages, sendMessage, addToolApprovalResponse, status, stop } =
    useChat({
      transport: new DefaultChatTransport({
        api: "/api/chat",
        body: {
          context: { projectId, route: pathname },
        },
      }),
      sendAutomaticallyWhen:
        lastAssistantMessageIsCompleteWithApprovalResponses,
      onFinish: () => {
        // Invalidate queries after AI makes changes
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({ queryKey: ["project-stats"] });
        if (projectId) {
          queryClient.invalidateQueries({ queryKey: ["board", projectId] });
        }
      },
    });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
        title="Open AI assistant"
      >
        <MessageCircle size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[500px] bg-popover border border-border rounded-lg shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-medium text-foreground">
          Retrack AI
        </span>
        <button
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Ask me to manage your projects, items, sections, and more.
          </p>
        )}
        {messages.map((message) => (
          <div key={message.id} className="text-sm">
            <span className="font-medium text-foreground">
              {message.role === "user" ? "You" : "AI"}:
            </span>{" "}
            {message.parts.map((part, i) => {
              const key = `${message.id}-${i}`;

              if (part.type === "text") {
                return (
                  <span key={key} className="text-foreground whitespace-pre-wrap">
                    {part.text}
                  </span>
                );
              }

              // Handle all tool parts generically using part.type prefix
              if (part.type.startsWith("tool-") && "state" in part) {
                const toolPart = part as any;

                // Approval requested (for tools with needsApproval)
                if (toolPart.state === "approval-requested") {
                  return (
                    <div
                      key={key}
                      className="my-2 p-2 rounded border border-destructive/30 bg-destructive/5"
                    >
                      <p className="text-xs text-muted-foreground mb-2">
                        Confirm destructive action?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() =>
                            addToolApprovalResponse({
                              id: toolPart.approval.id,
                              approved: true,
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() =>
                            addToolApprovalResponse({
                              id: toolPart.approval.id,
                              approved: false,
                            })
                          }
                        >
                          Deny
                        </Button>
                      </div>
                    </div>
                  );
                }

                if (toolPart.state === "output-denied") {
                  return (
                    <div key={key} className="my-1 text-xs text-muted-foreground">
                      Action denied.
                    </div>
                  );
                }

                if (
                  toolPart.state === "input-available" ||
                  toolPart.state === "input-streaming"
                ) {
                  return (
                    <div
                      key={key}
                      className="my-1 text-xs text-muted-foreground italic"
                    >
                      Executing...
                    </div>
                  );
                }
                if (toolPart.state === "output-available") {
                  return (
                    <div
                      key={key}
                      className="my-1 text-xs text-emerald-600 dark:text-emerald-400"
                    >
                      Done
                    </div>
                  );
                }
                if (toolPart.state === "output-error") {
                  return (
                    <div key={key} className="my-1 text-xs text-destructive">
                      Error: {toolPart.errorText}
                    </div>
                  );
                }
              }

              return null;
            })}
          </div>
        ))}
        {status === "submitted" && (
          <div className="text-xs text-muted-foreground italic">Thinking...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && status === "ready") {
              sendMessage({ text: input });
              setInput("");
            }
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            disabled={status !== "ready" && status !== "error"}
            className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          {status === "streaming" || status === "submitted" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 w-9 p-0"
              onClick={() => stop()}
            >
              <Square size={14} />
            </Button>
          ) : (
            <Button
              type="submit"
              size="sm"
              className="h-9 w-9 p-0"
              disabled={!input.trim()}
            >
              <Send size={14} />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add AiChat to dashboard layout**

In `src/app/dashboard/layout.tsx`, add import at top:

```ts
import { AiChat } from "@/components/AiChat";
```

Add `<AiChat />` just before the closing `</div>` of the root wrapper (line 312, before `</div>`):

```tsx
      <main className="flex-1 p-4 bg-background overflow-auto">
        {children}
      </main>
      <AiChat />
    </div>
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

- [ ] **Step 4: Test manually**

```bash
pnpm dev
```

Open http://localhost:3000/dashboard. The floating chat button should appear in the bottom-right corner. Click it to open the chat panel. Type "list my projects" and verify the AI responds with your projects.

- [ ] **Step 5: Commit**

```bash
git add src/components/AiChat.tsx src/app/dashboard/layout.tsx
git commit -m "feat: add floating AI chat widget to dashboard"
```

---

### Task 9: Final integration verification

- [ ] **Step 1: Test project operations**

In the chat, test:
- "Create a project called Test AI"
- "List my projects"
- "Delete project Test AI" (should show approval dialog)

- [ ] **Step 2: Test board operations**

Navigate to a project page. Test:
- "What sections does this project have?"
- "Create a section called QA"
- "Add an item 'Fix login bug' to the QA section"
- "Tag that item as a bug"
- "Search for 'login'"

- [ ] **Step 3: Test multi-step**

Test: "What's the weather in..." — this should NOT work (no weather tool). The AI should explain it can only help with project management.

Test: "Create 3 sections: To Do, In Progress, Done" — the AI should make 3 tool calls in sequence.

- [ ] **Step 4: Test delete approval**

Test: "Delete the QA section" — should show approval buttons. Click Deny. Verify section still exists.

- [ ] **Step 5: Verify SSE sync**

Open two browser tabs on the same project. Use the AI chat in tab 1 to create an item. Verify tab 2 updates in real-time via SSE.

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git add src/server/ src/components/AiChat.tsx src/app/dashboard/layout.tsx
git commit -m "fix: AI chat integration fixes"
```
