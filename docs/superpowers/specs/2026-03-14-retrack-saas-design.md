# Retrack SaaS Platform — Design Spec

## Overview

Transform the existing client-side Release Tracker (a kanban-style QA test matrix) into **Retrack**, a multi-tenant SaaS platform. The app moves from a Vite SPA with localStorage to a Next.js + Hono backend with PostgreSQL, real-time collaboration, auth, organizations, and Stripe billing.

---

## Phase 1: Next.js + Hono Migration + Drizzle Schema

### Goal
Replace Vite SPA with Next.js 15 App Router. Mount Hono as the API framework at `/api/*`. Set up Drizzle ORM with PostgreSQL.

### Architecture

```
next.js app/
├── (marketing)/          → Landing page (public)
│   └── page.tsx
├── (auth)/               → Auth pages (public)
│   ├── sign-in/page.tsx
│   └── sign-up/page.tsx
├── dashboard/            → Protected app shell
│   ├── layout.tsx        → Sidebar, org switcher, nav
│   ├── page.tsx          → Dashboard home (project list)
│   ├── projects/
│   │   └── [id]/page.tsx → Kanban board
│   ├── settings/page.tsx → User & org settings
│   └── billing/page.tsx  → Stripe billing portal
├── api/
│   └── [...route]/route.ts → Hono catch-all
```

### Hono API Structure

All API logic lives in Hono, mounted as a Next.js catch-all route handler:

```
/api/auth/*          → Better Auth routes (delegated)
/api/projects        → CRUD projects
/api/projects/:id    → Single project
/api/sections        → CRUD sections within a project
/api/items           → CRUD items within a section
/api/items/:id/notes → CRUD notes on items
/api/sse             → Server-Sent Events endpoint
```

### Drizzle Schema (PostgreSQL)

Core tables:

- **user** — managed by Better Auth
- **session** — managed by Better Auth
- **account** — managed by Better Auth
- **organization** — managed by Better Auth Organizations plugin
- **member** — managed by Better Auth Organizations plugin
- **invitation** — managed by Better Auth Organizations plugin
- **subscription** — managed by Better Auth Stripe plugin

App-specific tables:

- **project** — `id`, `name`, `description`, `organizationId`, `createdBy`, `createdAt`, `updatedAt`
- **section** — `id`, `projectId`, `title`, `order`, `color`, `icon`, `open`, `createdAt`, `updatedAt`
- **item** — `id`, `sectionId`, `text`, `checked`, `order`, `createdAt`, `updatedAt`
- **item_tag** — `id`, `itemId`, `tag` (enum: bug, question, later)
- **note** — `id`, `itemId`, `text`, `createdBy`, `createdAt`

All app tables reference `organizationId` directly or transitively (via project) for multi-tenant isolation.

### Migration Strategy

- New Next.js project structure replaces Vite config
- Existing React components move to `src/components/` under the Next.js app
- `useTracker` hook gets replaced by React Query hooks calling Hono API
- localStorage import/export preserved as a migration tool (import old data into DB)

---

## Phase 2: Better Auth (Auth + Organizations + Stripe)

### Goal
Implement authentication, organization management, and Stripe billing using Better Auth and its plugins.

### Auth Setup

- **Better Auth server** configured in `lib/auth.ts`, mounted in Hono at `/api/auth/*`
- **Database adapter**: Drizzle (PostgreSQL)
- **Email/password** sign-in and sign-up
- **Session management**: cookie-based, httpOnly, secure

### Pages

- `/sign-in` — email + password form, link to sign-up
- `/sign-up` — email + password + name form, link to sign-in
- After sign-up: user creates or joins an Organization

### Organizations Plugin

- Every workspace is an **Organization**
- Users can create organizations, invite members by email
- Roles: `owner`, `admin`, `member`
- Organization switcher in dashboard sidebar
- Middleware enforces org context on all `/dashboard/*` routes

### Stripe Plugin (Better Auth)

- Three plans: **Free**, **Team** ($19/mo), **Business** ($49/mo)
- Plan limits enforced server-side:
  - Free: 1 member, 2 projects, 5 sections/project
  - Team: 3 members, 10 projects, unlimited sections
  - Business: 15 members (+ $5/extra), unlimited projects, SSO
- Stripe Checkout for upgrades
- Stripe Customer Portal for managing subscriptions
- Webhook handling for subscription lifecycle events
- Billing page at `/dashboard/billing` shows current plan, usage, manage button

---

## Phase 3: Projects Model + DB-Backed Kanban

### Goal
Wrap existing kanban logic in a "Project" abstraction. All data is now DB-backed and scoped to an organization.

### Project

- A Project belongs to an Organization
- Contains sections, which contain items (same hierarchy as current app)
- Project list is the dashboard home page
- Clicking a project opens the kanban board at `/dashboard/projects/[id]`

### Data Flow

1. User navigates to `/dashboard` → React Query fetches projects for current org
2. User clicks a project → navigates to `/dashboard/projects/[id]`
3. Kanban board loads sections + items via React Query
4. User mutations (add/check/move items) → call Hono API → invalidate queries
5. SSE pushes change events to other connected clients → they invalidate too

### Component Migration

- `KanbanBoard.tsx` — keep, wire to React Query instead of `useTracker`
- `Toolbar.tsx` — keep, adapt for project-scoped actions
- `ItemRow.tsx` — keep, wire to mutation hooks
- `useTracker.ts` — replace with React Query hooks:
  - `useProject(id)` — fetch project
  - `useSections(projectId)` — fetch sections
  - `useItems(sectionId)` — fetch items
  - `useCreateItem()`, `useUpdateItem()`, `useDeleteItem()` — mutations
  - Similar for sections and notes

### API Endpoints (Hono)

All endpoints require auth + org membership. Responses are JSON.

```
GET    /api/projects              → list org projects
POST   /api/projects              → create project
GET    /api/projects/:id          → get project with sections + items
PUT    /api/projects/:id          → update project
DELETE /api/projects/:id          → delete project

POST   /api/sections              → create section (body: projectId, title)
PUT    /api/sections/:id          → update section (title, order, color, icon, open)
DELETE /api/sections/:id          → delete section

POST   /api/items                 → create item (body: sectionId, text)
PUT    /api/items/:id             → update item (text, checked, order, sectionId)
DELETE /api/items/:id             → delete item

POST   /api/items/:id/tags        → set tags
POST   /api/items/:id/notes       → add note
DELETE /api/notes/:id             → delete note
```

---

## Phase 4: Real-Time Updates (SSE)

### Goal
When any user in an organization mutates data, all other connected clients see the update live.

### Architecture

- SSE endpoint: `GET /api/sse?projectId=xxx`
- Server maintains a map of connections per project
- On any mutation (create/update/delete), server broadcasts an event to all connections for that project
- Event payload: `{ type: "invalidate", entity: "items", projectId: "..." }`
- Client-side: SSE listener calls `queryClient.invalidateQueries({ queryKey: [entity, projectId] })`

### Implementation

- Hono SSE helper (built-in `c.stream()` or `hono/streaming`)
- In-memory connection store (Map of projectId → Set of writable streams)
- Mutation middleware: after successful write, broadcast to project subscribers
- Client hook: `useSSE(projectId)` — connects on mount, disconnects on unmount, auto-reconnects

### Limitations

- In-memory connection store means single-process only. For horizontal scaling later, use Redis pub/sub. Out of scope for now.

---

## Phase 5: Landing Page + Dashboard Shell

### Landing Page (`/`)

**Design principles:**
- Apple-like, clean, white/black with accent colors only
- NO gradients anywhere
- Framer Motion scroll animations
- Bricolage Grotesque font (already loaded)

**Sections:**
1. **Hero** — headline, subline, CTA buttons (Get Started / Sign In), product screenshot/mockup
2. **Features** — 3-4 key features with icons and short descriptions
   - Real-time collaboration
   - Kanban test matrix
   - Team management
   - Track releases with ease
3. **Pricing** — 3-tier cards (Free / Team / Business) matching Stripe plans
4. **CTA** — final call to action, sign-up button
5. **Footer** — links, copyright

**Color system redesign:**
- Background: `#ffffff` (white) / `#000000` (black for dark sections)
- Text: `#0a0a0a` (near-black) / `#fafafa` (near-white on dark)
- Accent: single brand color (carry over sage green `#7a8c5c` or refine)
- Borders: `#e5e5e5` (light gray)
- Muted: `#737373` (medium gray)

### Dashboard Shell

- Left sidebar: org switcher, navigation (Projects, Settings, Billing), user menu
- Top bar: breadcrumbs, project-level actions
- Main content area: renders route content
- Responsive: sidebar collapses on mobile

---

## Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Package manager | pnpm | Already in use |
| Runtime | Node.js | Coolify deployment, simplest for Next.js |
| Database | PostgreSQL | SaaS-grade, Drizzle + Better Auth support |
| ORM | Drizzle | Type-safe, lightweight, great migrations |
| Auth | Better Auth | All-in-one: auth + orgs + Stripe |
| API framework | Hono | Fast, lightweight, great DX inside Next.js |
| State management | React Query | Caching, mutations, invalidation |
| Real-time | SSE | Simple, one-way push, no extra infra |
| Styling | Tailwind CSS | Already in use |
| Animation | Framer Motion | Already in use |
| Deployment | Coolify | Self-hosted, built-in Postgres |

---

## Security Considerations

- All API routes validate auth session via Better Auth middleware
- Org-scoped queries: every DB query filters by `organizationId`
- CSRF protection via Better Auth
- Rate limiting on auth endpoints
- Input validation on all Hono routes (zod schemas)
- HttpOnly, Secure, SameSite cookies for sessions

---

## Out of Scope (Future)

- SSO (Better Auth supports it, but Business-tier only — implement later)
- Horizontal scaling (Redis pub/sub for SSE)
- Email notifications
- Audit logging
- File attachments on items
- Custom roles beyond owner/admin/member
