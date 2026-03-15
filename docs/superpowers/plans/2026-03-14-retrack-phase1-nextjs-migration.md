# Phase 1: Next.js + Hono Migration + Drizzle Schema

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Vite SPA with Next.js 15 App Router, mount Hono as API framework at `/api/*`, set up Drizzle ORM with PostgreSQL schema.

**Architecture:** Next.js App Router for pages/layouts, Hono catch-all route handler for all API logic, Drizzle ORM for type-safe database access. Existing React components migrate into the Next.js `src/` structure with minimal changes.

**Tech Stack:** Next.js 15, Hono, Drizzle ORM, PostgreSQL, TanStack React Query, Tailwind CSS 4, Framer Motion

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (html, body, providers)
│   ├── (marketing)/
│   │   └── page.tsx                  # Landing page placeholder
│   ├── (auth)/
│   │   ├── sign-in/page.tsx          # Sign-in placeholder
│   │   └── sign-up/page.tsx          # Sign-up placeholder
│   ├── dashboard/
│   │   ├── layout.tsx                # Dashboard shell (sidebar, nav)
│   │   ├── page.tsx                  # Project list placeholder
│   │   └── projects/
│   │       └── [id]/page.tsx         # Kanban board placeholder
│   └── api/
│       └── [...route]/route.ts       # Hono catch-all
├── server/
│   ├── app.ts                        # Hono app instance + route mounting
│   ├── routes/
│   │   └── health.ts                 # Health check route
│   └── db/
│       ├── index.ts                  # Drizzle client instance
│       ├── schema/
│       │   ├── index.ts              # Re-export all schemas
│       │   ├── projects.ts           # project table
│       │   ├── sections.ts           # section table
│       │   ├── items.ts              # item + item_tag tables
│       │   └── notes.ts              # note table
│       └── migrate.ts                # Migration runner
├── lib/
│   ├── query-client.ts               # TanStack Query client factory
│   └── providers.tsx                 # QueryClientProvider wrapper
├── components/                       # Existing components (moved from src/)
│   ├── KanbanBoard.tsx
│   ├── Toolbar.tsx
│   ├── ItemRow.tsx
│   ├── TagPicker.tsx
│   ├── ConfirmModal.tsx
│   ├── SuccessModal.tsx
│   ├── StatsModal.tsx
│   ├── SectionMenu.tsx
│   ├── SectionCard.tsx
│   ├── SectionColorPicker.tsx
│   ├── SectionIconPicker.tsx
│   ├── SectionIcons.ts
│   └── Icons.tsx
├── hooks/                            # Existing hooks (moved from src/)
│   ├── useTracker.ts
│   └── useLocalStorage.ts
├── types/
│   └── tracker.ts                    # Existing types (moved from src/)
└── index.css                         # Global styles (moved from src/)

drizzle.config.ts                     # Drizzle Kit config (project root)
.env.local                            # Environment variables
next.config.ts                        # Next.js config
tailwind.config.ts                    # Tailwind config (if needed for v4)
postcss.config.mjs                    # PostCSS config
```

---

### Task 1: Initialize Next.js and Remove Vite

**Files:**
- Delete: `vite.config.ts`, `index.html`
- Create: `next.config.ts`, `postcss.config.mjs`, `.env.local`
- Modify: `package.json`, `tsconfig.json`

- [ ] **Step 1: Install Next.js and remove Vite dependencies**

```bash
pnpm remove vite @vitejs/plugin-react @tailwindcss/vite
pnpm add next@latest
pnpm add -D @tailwindcss/postcss
```

- [ ] **Step 2: Create `next.config.ts`**

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

- [ ] **Step 3: Create `postcss.config.mjs`**

```js
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 4: Create `.env.local`**

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/retrack
BETTER_AUTH_SECRET=generate-a-32-char-secret-here-ok
BETTER_AUTH_URL=http://localhost:3000
```

- [ ] **Step 5: Update `package.json` scripts**

Replace the `scripts` section:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

- [ ] **Step 6: Update `tsconfig.json`**

Replace contents with Next.js-compatible config:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 7: Delete Vite files**

```bash
rm vite.config.ts index.html
rm -f tsconfig.app.json tsconfig.node.json
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: replace vite with next.js 15"
```

---

### Task 2: Restructure Source Files for Next.js App Router

**Files:**
- Move: all `src/components/*`, `src/hooks/*`, `src/types/*`, `src/index.css`
- Create: `src/app/layout.tsx`, `src/app/(marketing)/page.tsx`
- Delete: `src/main.tsx`, `src/App.tsx` (temporarily — logic moves to dashboard later)

- [ ] **Step 1: Move existing source files into Next.js structure**

```bash
# Components, hooks, types, styles stay in src/ — Next.js uses src/ by default
# They are already in the right place: src/components/, src/hooks/, src/types/
# Just need to move index.css to be importable from layout
mv src/App.tsx src/components/App.tsx
rm src/main.tsx
```

- [ ] **Step 2: Create root layout `src/app/layout.tsx`**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "@/index.css";

export const metadata: Metadata = {
  title: "Retrack — QA Test Matrix for Teams",
  description: "Real-time collaborative test tracking for QA teams",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Create marketing landing placeholder `src/app/(marketing)/page.tsx`**

```tsx
// src/app/(marketing)/page.tsx
export default function HomePage() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Retrack</h1>
      <p>QA Test Matrix for Teams — coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 4: Create auth page placeholders**

```tsx
// src/app/(auth)/sign-in/page.tsx
export default function SignInPage() {
  return <div>Sign In — placeholder</div>;
}
```

```tsx
// src/app/(auth)/sign-up/page.tsx
export default function SignUpPage() {
  return <div>Sign Up — placeholder</div>;
}
```

- [ ] **Step 5: Create dashboard layout and page placeholders**

```tsx
// src/app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 240, borderRight: "1px solid #e5e5e5", padding: "1rem" }}>
        <h2>Retrack</h2>
        <nav>
          <ul>
            <li><a href="/dashboard">Projects</a></li>
            <li><a href="/dashboard/settings">Settings</a></li>
            <li><a href="/dashboard/billing">Billing</a></li>
          </ul>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: "1rem" }}>{children}</main>
    </div>
  );
}
```

```tsx
// src/app/dashboard/page.tsx
export default function DashboardPage() {
  return <div>Projects list — placeholder</div>;
}
```

```tsx
// src/app/dashboard/projects/[id]/page.tsx
export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  return <div>Kanban board — placeholder</div>;
}
```

- [ ] **Step 6: Verify the app starts**

```bash
pnpm dev
```

Expected: Next.js dev server starts, landing page shows at `/`, dashboard placeholder at `/dashboard`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: restructure source files for next.js app router"
```

---

### Task 3: Set Up Hono API Framework

**Files:**
- Create: `src/server/app.ts`, `src/server/routes/health.ts`, `src/app/api/[...route]/route.ts`

- [ ] **Step 1: Install Hono**

```bash
pnpm add hono
```

- [ ] **Step 2: Create Hono app instance `src/server/app.ts`**

```ts
// src/server/app.ts
import { Hono } from "hono";
import { logger } from "hono/logger";
import health from "./routes/health";

const app = new Hono().basePath("/api");

app.use("*", logger());

app.route("/health", health);

export default app;
export type AppType = typeof app;
```

- [ ] **Step 3: Create health check route `src/server/routes/health.ts`**

```ts
// src/server/routes/health.ts
import { Hono } from "hono";

const health = new Hono();

health.get("/", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default health;
```

- [ ] **Step 4: Create Next.js catch-all route handler `src/app/api/[...route]/route.ts`**

```ts
// src/app/api/[...route]/route.ts
import { handle } from "hono/vercel";
import app from "@/server/app";

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
```

- [ ] **Step 5: Test the health endpoint**

```bash
curl http://localhost:3000/api/health
```

Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add hono api framework with health check"
```

---

### Task 4: Set Up Drizzle ORM + PostgreSQL Schema

**Files:**
- Create: `drizzle.config.ts`, `src/server/db/index.ts`, `src/server/db/schema/index.ts`, `src/server/db/schema/projects.ts`, `src/server/db/schema/sections.ts`, `src/server/db/schema/items.ts`, `src/server/db/schema/notes.ts`

- [ ] **Step 1: Install Drizzle and PostgreSQL driver**

```bash
pnpm add drizzle-orm pg
pnpm add -D drizzle-kit @types/pg
```

- [ ] **Step 2: Create `drizzle.config.ts`**

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/server/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 3: Create DB client `src/server/db/index.ts`**

```ts
// src/server/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
```

- [ ] **Step 4: Create project schema `src/server/db/schema/projects.ts`**

```ts
// src/server/db/schema/projects.ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const project = pgTable("project", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  organizationId: text("organization_id").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 5: Create section schema `src/server/db/schema/sections.ts`**

```ts
// src/server/db/schema/sections.ts
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
```

- [ ] **Step 6: Create item + tag schemas `src/server/db/schema/items.ts`**

```ts
// src/server/db/schema/items.ts
import { pgTable, text, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { section } from "./sections";

export const tagEnum = pgEnum("tag", ["bug", "question", "later"]);

export const item = pgTable("item", {
  id: text("id").primaryKey(),
  sectionId: text("section_id").notNull().references(() => section.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  checked: boolean("checked").notNull().default(false),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const itemTag = pgTable("item_tag", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull().references(() => item.id, { onDelete: "cascade" }),
  tag: tagEnum("tag").notNull(),
});
```

- [ ] **Step 7: Create note schema `src/server/db/schema/notes.ts`**

```ts
// src/server/db/schema/notes.ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { item } from "./items";

export const note = pgTable("note", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull().references(() => item.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 8: Create schema barrel export `src/server/db/schema/index.ts`**

```ts
// src/server/db/schema/index.ts
export * from "./projects";
export * from "./sections";
export * from "./items";
export * from "./notes";
```

- [ ] **Step 9: Generate initial migration**

```bash
pnpm db:generate
```

Expected: Migration files created in `drizzle/` directory.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add drizzle orm with postgresql schema"
```

---

### Task 5: Set Up TanStack React Query Provider

**Files:**
- Create: `src/lib/query-client.ts`, `src/lib/providers.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Install TanStack Query**

```bash
pnpm add @tanstack/react-query
```

- [ ] **Step 2: Create query client factory `src/lib/query-client.ts`**

```ts
// src/lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";

let queryClient: QueryClient | null = null;

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always create a new client
    return new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30 * 1000 },
      },
    });
  }
  // Browser: reuse singleton
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30 * 1000 },
      },
    });
  }
  return queryClient;
}
```

- [ ] **Step 3: Create providers wrapper `src/lib/providers.tsx`**

```tsx
// src/lib/providers.tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "./query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

- [ ] **Step 4: Wrap root layout with Providers**

Update `src/app/layout.tsx` to import and use the `Providers` component around `{children}`:

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "@/index.css";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
  title: "Retrack — QA Test Matrix for Teams",
  description: "Real-time collaborative test tracking for QA teams",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify build succeeds**

```bash
pnpm build
```

Expected: Build completes without errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add tanstack react query provider"
```

---

### Task 6: Verify Full Stack Smoke Test

- [ ] **Step 1: Start dev server and verify all routes**

```bash
pnpm dev
```

Check these URLs return without errors:
- `http://localhost:3000/` → Landing placeholder
- `http://localhost:3000/sign-in` → Sign-in placeholder
- `http://localhost:3000/sign-up` → Sign-up placeholder
- `http://localhost:3000/dashboard` → Dashboard placeholder
- `http://localhost:3000/api/health` → `{"status":"ok",...}`

- [ ] **Step 2: Verify database connection (requires running PostgreSQL)**

```bash
pnpm db:push
```

Expected: Schema pushed to database successfully.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "chore: phase 1 complete — next.js + hono + drizzle foundation"
```
