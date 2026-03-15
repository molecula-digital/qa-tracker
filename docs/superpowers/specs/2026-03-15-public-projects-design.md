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

## 1. Schema Changes

**Table: `project`** — add two columns:

```
slug       text     — unique per org, auto-generated from name, editable
isPublic   boolean  — default false
```

- Unique constraint: `(organizationId, slug)`
- Slug generation: lowercase → replace spaces/special chars with hyphens → strip non-alphanumeric (except hyphens) → truncate to 60 chars → append 4-char random suffix on collision
- Slug is generated on project creation and can be edited by the owner in project settings

**Migration:** Add columns with defaults (`slug = id`, `isPublic = false`), then backfill slugs from existing project names.

## 2. Public API Route

**New file:** `src/server/routes/public-board.ts`

**Endpoint:** `GET /api/public/board?org=:orgSlug&project=:projectSlug`

- No auth middleware
- Lookup: org by slug → project by `(organizationId, slug, isPublic = true)`
- Returns 404 if project doesn't exist or isn't public
- Response shape:

```json
{
  "project": {
    "name": "v2.0 Release",
    "description": "Tracking all v2.0 items",
    "slug": "v2-release"
  },
  "sections": [
    {
      "id": "...",
      "title": "Backend",
      "open": true,
      "color": "#10b981",
      "icon": "server",
      "items": [
        {
          "id": "...",
          "text": "Migrate auth",
          "checked": true,
          "tags": ["bug"]
        }
      ]
    }
  ]
}
```

Notes are excluded from the response. No rate limiting initially.

## 3. Public Frontend Route

**New file:** `src/app/(public)/p/[orgSlug]/[projectSlug]/page.tsx`

- No auth required — outside dashboard route group
- Client-side fetch from `/api/public/board`
- Layout: standalone page with theme provider (dark/light), no sidebar
- Renders:
  - Project name as heading, description as subtitle
  - Read-only KanbanBoard — reuses existing `KanbanBoard` component with all mutation callbacks as no-ops/undefined
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
- Extend `PUT /api/projects/:id` validation to accept `isPublic` (boolean) and `slug` (string, 1-60 chars, URL-safe pattern)
- Slug uniqueness check on update — return 409 on collision

## 5. KanbanBoard Read-Only Mode

The existing `KanbanBoard` component needs to gracefully handle "no callbacks":
- Make all `on*` props optional
- When callbacks are undefined: hide add-item inputs, hide delete buttons, hide section controls (color/icon/reorder), disable checkboxes, hide tag picker triggers, hide note add/delete
- The board becomes a pure display of the current state

## 6. Files to Create/Modify

| Action | File |
|--------|------|
| Modify | `src/server/db/schema/projects.ts` — add `slug`, `isPublic` columns |
| Create | DB migration for new columns |
| Create | `src/server/routes/public-board.ts` — public board endpoint |
| Modify | `src/server/index.ts` — mount public-board route |
| Modify | `src/server/routes/projects.ts` — extend PUT validation, generate slug on POST |
| Create | `src/app/(public)/layout.tsx` — minimal public layout |
| Create | `src/app/(public)/p/[orgSlug]/[projectSlug]/page.tsx` — public project page |
| Modify | `src/app/dashboard/projects/[id]/page.tsx` — add Settings tab |
| Modify | `src/components/KanbanBoard.tsx` — make mutation callbacks optional |
| Create | `src/lib/slugify.ts` — slug generation utility |
