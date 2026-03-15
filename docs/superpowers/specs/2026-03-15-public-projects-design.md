# Public Projects — Design Spec

## Overview

Allow project owners to toggle a project as "public", making it viewable at a human-readable URL (`/p/:orgSlug/:projectSlug`) by anyone — no login required. The public view is read-only: a clean rendering of the board (sections, items, tags, checked state). No notes, no activity, no editing.

## Decisions

| Question | Decision |
|----------|----------|
| What's visible publicly? | Board only (sections, items, tags, checked state). No notes, activity, or stats. |
| URL structure | `/p/:orgSlug/:projectSlug` — human-readable, `/p/` prefix avoids route collisions |
| Discoverability | Unlisted — accessible via direct link only, no public org listing page |
| Toggle location | Settings tab within the project detail page (`/dashboard/projects/[id]`) |
| Branding on public page | None — completely clean |
| Architecture | Dedicated public API route + frontend route, fully separate from authenticated paths |
| Real-time (SSE) | Out of scope for public pages — static fetch only |
| CORS | Open for the public endpoint (read-only, no sensitive data) |
| Slug stability | Slug does NOT auto-change on project rename — only changes when explicitly edited |
| `isPublic` toggled off | Immediate 404 — no grace period or message |

## 1. Schema Changes

**Table: `project`** — add two columns:

```
slug       text     — unique per org, auto-generated from name, editable
isPublic   boolean  — default false
```

- Composite unique constraint: `(organizationId, slug)` via `uniqueIndex("project_org_slug_uidx").on(table.organizationId, table.slug)`
- Slug generation: lowercase → replace spaces/special chars with hyphens → strip non-alphanumeric (except hyphens) → truncate to 60 chars → append 4-char random suffix on collision (max 3 retries, fail with error if all collide)
- Slug is generated on project creation and does NOT auto-update on project rename. Only changes when the owner explicitly edits it in project settings.

**Migration (multi-step):**
1. Add `slug` (nullable) and `isPublic` (default `false`) columns
2. Backfill: generate slugs from existing project names using the same slugify logic with collision-suffix strategy
3. Set `slug` to NOT NULL, add composite unique index

## 2. Public API Route

**New file:** `src/server/routes/public-board.ts`

**Endpoint:** `GET /api/public/board/:orgSlug/:projectSlug`

- No auth middleware — mounted under a `/public` sub-router in `src/server/app.ts`
- Lookup: org by slug → project by `(organizationId, slug, isPublic = true)`
- Returns 404 if project doesn't exist or isn't public (identical response for both cases to prevent enumeration)
- Items ordered by `asc(item.order)`, sections by `asc(section.order)`
- All sections rendered as `open: true` in the public view regardless of owner's collapse state
- Response shape (no internal IDs exposed):

```json
{
  "project": {
    "name": "v2.0 Release",
    "description": "Tracking all v2.0 items",
    "slug": "v2-release"
  },
  "sections": [
    {
      "title": "Backend",
      "color": "#10b981",
      "icon": "server",
      "items": [
        {
          "text": "Migrate auth",
          "checked": true,
          "tags": ["bug"]
        }
      ]
    }
  ]
}
```

Notes and internal IDs are excluded from the response. Description is treated as plain text (no HTML rendering).

**Caching:** `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` on the response.

## 3. Public Frontend Route

**New file:** `src/app/(public)/p/[orgSlug]/[projectSlug]/page.tsx`

- No auth required — outside dashboard route group
- Client-side fetch from `/api/public/board/:orgSlug/:projectSlug`
- Layout: standalone page with theme provider (dark/light), no sidebar
- SEO: `<title>` set to project name, `<meta description>` from project description, Open Graph tags for link previews
- Renders:
  - Project name as heading, description as subtitle
  - Read-only KanbanBoard — reuses existing `KanbanBoard` component with `readOnly` prop
  - No search, no "Add section" button, no tabs
- Responsive, works on mobile

**Layout file:** `src/app/(public)/layout.tsx` — minimal shell with theme provider.

## 4. Project Settings UI

**Location:** New "Settings" tab in `/dashboard/projects/[id]` page, alongside Board, Activity, Stats.

### Public Access Section
- `Switch` component with label "Make this project public"
- When enabled, a panel appears showing:
  - Public URL with copy-to-clipboard button
  - Editable slug input (auto-generated from name, customizable)
- When disabled, panel hides

### Project Details Section
- Editable name and description fields
- Save button

### API Changes
- Extend `PUT /api/projects/:id` validation to accept `isPublic` (boolean) and `slug` (string, 1-60 chars, URL-safe pattern `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`)
- Slug uniqueness check on update — return 409 on collision

## 5. KanbanBoard Read-Only Mode

Add a single `readOnly?: boolean` prop to `KanbanBoard` that flows down to `KanbanColumn` and `KanbanCard`:

- When `readOnly = true`: hide add-item inputs, hide delete buttons, hide section controls (color/icon/reorder), render checkboxes as visual-only (disabled), hide tag picker triggers, hide note add/delete
- All existing `on*` callbacks remain required — `readOnly` controls visibility of interactive elements
- The board becomes a pure display of the current state

## 6. Files to Create/Modify

| Action | File |
|--------|------|
| Modify | `src/server/db/schema/projects.ts` — add `slug`, `isPublic` columns |
| Create | DB migration for new columns (multi-step) |
| Create | `src/server/routes/public-board.ts` — public board endpoint |
| Modify | `src/server/app.ts` — mount public-board route under `/public` sub-router |
| Modify | `src/server/routes/projects.ts` — extend PUT validation, generate slug on POST |
| Create | `src/app/(public)/layout.tsx` — minimal public layout |
| Create | `src/app/(public)/p/[orgSlug]/[projectSlug]/page.tsx` — public project page |
| Modify | `src/app/dashboard/projects/[id]/page.tsx` — add Settings tab |
| Modify | `src/components/KanbanBoard.tsx` — add `readOnly` prop, flow to children |
| Create | `src/lib/slugify.ts` — slug generation utility |
