# AI Chat Assistant — Design Spec

**Date:** 2026-03-15
**Status:** Draft

## Overview

Add a floating AI chat assistant to the Retrack dashboard that can perform all CRUD actions on projects, sections, items, notes, tags, and project links. The AI uses OpenAI via the Vercel AI SDK with server-side tool execution. Destructive actions (deletes) require user approval before executing.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Dashboard UI                                    │
│  ┌────────────────────────────────────────────┐ │
│  │  Floating Chat Widget (AiChat.tsx)         │ │
│  │  - useChat hook → POST /api/chat           │ │
│  │  - sends { messages, context }             │ │
│  │  - renders text, tool status, approvals    │ │
│  └──────────────────┬─────────────────────────┘ │
└─────────────────────┼───────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────┐
│  Hono route: /api/chat                           │
│  - requireOrg middleware (auth + org check)      │
│  - streamText (AI SDK + OpenAI gpt-4o-mini)     │
│  - 23 server-side tools with execute functions   │
│  - needsApproval on all delete tools             │
│  - stopWhen: stepCountIs(10)                     │
│  └──────────────────┬────────────────────────┘  │
│                     │                            │
│  Service Layer (shared with Hono API routes)     │
│  - project-service.ts                            │
│  - section-service.ts                            │
│  - item-service.ts                               │
│  - note-service.ts                               │
│  - board-service.ts                              │
│  - activity-service.ts                           │
│  - project-link-service.ts                       │
│  └──────────────────┬────────────────────────┘  │
│                     │                            │
│              Drizzle (PostgreSQL)                 │
└──────────────────────────────────────────────────┘
```

## Components

### 1. Service Layer — `src/server/services/`

Extract DB logic from Hono route handlers into standalone service functions. Each function takes `orgId` and `userId` as parameters. Activity logging and SSE broadcasts are called within services so both Hono routes and AI tools trigger them.

**SSE broadcast note:** The existing SSE system is keyed by `projectId` only — clients subscribe per-project via `useSSE(projectId)`. The dashboard page does not use SSE at all. For project-level mutations (create/update/delete project), the service layer will **not** broadcast SSE events. Instead, the AI chat widget will trigger React Query invalidation directly on the client after a project mutation tool completes (via `onFinish` callback or by the component detecting `output-available` on project tool parts and calling `queryClient.invalidateQueries`). All other services (sections, items, notes, links) continue broadcasting SSE on `projectId` as before.

**Activity logging note:** The existing projects route does not call `logActivity`. The service layer will add activity logging for project create/update/delete — this is new behavior.

**Note editing:** There is no `updateNote` — notes are immutable by design (create and delete only). The AI will explain this to users if they ask to edit a note.

**Files:**

| File | Functions |
|------|-----------|
| `project-service.ts` | `listProjects`, `getProject`, `createProject`, `updateProject`, `deleteProject`, `getProjectStats` |
| `section-service.ts` | `createSection`, `updateSection`, `deleteSection` |
| `item-service.ts` | `createItem`, `updateItem`, `deleteItem`, `setItemTags`, `searchItems`, `getItemNotes` |
| `note-service.ts` | `createNote`, `deleteNote` |
| `board-service.ts` | `getBoard` |
| `activity-service.ts` | `getActivity` |
| `project-link-service.ts` | `listLinks`, `createLink`, `updateLink`, `deleteLink` |

**Hono routes refactored** to thin wrappers that validate input, call the service, and return JSON.

### 2. AI Tools — `src/server/ai/tools.ts`

23 tools using AI SDK `tool()` with Zod input schemas. All server-side with `execute` functions that call the service layer.

| Tool | Description | needsApproval |
|------|-------------|---------------|
| `listProjects` | List all projects in the org | No |
| `getProjectStats` | Get project stats | No |
| `createProject` | Create a new project | No |
| `updateProject` | Update project name/description | No |
| `deleteProject` | Delete a project | Yes |
| `getBoard` | Get board data (sections + items, notes as count only) | No |
| `listSections` | List sections for a project (lightweight, no items) | No |
| `createSection` | Create a section | No |
| `updateSection` | Update section title/color/icon | No |
| `deleteSection` | Delete a section | Yes |
| `createItem` | Create an item in a section | No |
| `updateItem` | Update item text, checked state, or move to another section | No |
| `deleteItem` | Delete an item | Yes |
| `setItemTags` | Set tags on an item | No |
| `searchItems` | Search items by text (ILIKE) across a project or all projects | No |
| `getItemNotes` | Get all notes for a specific item | No |
| `createNote` | Add a note to an item | No |
| `deleteNote` | Delete a note | Yes |
| `getActivity` | Get activity log | No |
| `listProjectLinks` | List project links | No |
| `createProjectLink` | Add a project link | No |
| `updateProjectLink` | Update a project link | No |
| `deleteProjectLink` | Delete a project link | Yes |

Tools that operate within a project accept `projectId` as optional — the system prompt tells the AI to use the active project from context when the user doesn't specify one.

**`searchItems` details:** Accepts `query` (string, required) and `projectId` (optional — searches all org projects if omitted). Uses `ILIKE '%query%'` on item text. Returns matching items with their section title and project name for context. Limited to 20 results.

**`updateItem` details:** Accepts `itemId` (required), plus optional `text`, `checked`, `sectionId` (to move between sections), and `order`. This allows the AI to move items between sections.

**`getBoard` payload:** Returns sections with their items. Each item includes `id`, `text`, `checked`, `tags`, and `noteCount` (integer). Full note content is not included — use `getItemNotes` to read notes for a specific item. This keeps the payload manageable for large boards.

**`listSections` details:** Lightweight alternative to `getBoard` — returns only section `id`, `title`, `color`, `icon`, and item count. Useful when the AI just needs to know what sections exist.

### 3. Chat Route — `src/server/routes/chat.ts`

Hono route registered in `src/server/app.ts`.

- Uses `requireOrg` middleware
- Extracts `messages` (UIMessage[]) and `context` ({ projectId?, route }) from request body
- Builds system prompt with org name and project context
- Calls `streamText` with all tools, closuring over `orgId`/`userId`
- Returns `result.toUIMessageStreamResponse()`

**System prompt:**

```
You are Retrack AI, an assistant for the Retrack release tracker.
You help users manage their projects, sections, items, notes, and links.

Current context:
- Organization: {orgName}
- Current page: {route}
- Active project: {projectId | "none"}

When the user refers to "this project" or doesn't specify a project,
use the active project ID. If no project is active, ask which project.

For destructive actions (deletes), you will ask for user approval before executing.
Notes are immutable — they can be created and deleted but not edited.
Keep responses concise and action-oriented.
```

**Configuration:**
- Model: `openai('gpt-4o-mini')`
- `stopWhen: stepCountIs(10)`
- `maxTokens: 2048`

### 4. Floating Chat Widget — `src/components/AiChat.tsx`

**UI:**
- Floating button (bottom-right) with chat icon
- Opens a slide-up drawer/panel (~400px wide, ~500px tall)
- Message list with role labels
- Input field with submit button
- Stop button while streaming
- Close button

**Behavior:**
- Uses `useChat` from `@ai-sdk/react`
- Sends current route and project ID via request body context
- Extracts project ID from pathname: `/dashboard/projects/[id]`
- Uses `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses` for auto-submit after approvals

**Message rendering:**
- `text` parts → rendered as text
- `tool-*` parts with `input-available` state → "Executing [action]..." loading indicator
- `tool-*` parts with `output-available` state → success summary
- `tool-*` parts with `approval-requested` state → confirmation UI with Approve/Deny buttons
- `tool-*` parts with `output-error` state → error message

**Placement:** Rendered in `src/app/dashboard/layout.tsx`.

**Styling:** shadcn components + Tailwind, semantic theme tokens for dark/light mode.

### 5. React Query Invalidation

After AI tool execution mutates data, connected clients need fresh data. The service layer broadcasts SSE events, and the existing `useSSE` hook handles React Query invalidation. No additional work needed — AI mutations flow through the same services.

## New Dependencies

```
ai                — AI SDK core
@ai-sdk/react     — useChat hook
@ai-sdk/openai    — OpenAI provider
```

**Environment variable:** `OPENAI_API_KEY` in `.env.local`

## Design Decisions

### Chat history is not persisted
Conversations are client-side only via `useChat` state. History is lost on page refresh. This is intentional for v1 — persistence can be added later with a chat history table if needed.

### AI feature is available to all plans
No plan-gating for v1. The AI assistant is available to all authenticated users with an active organization. Cost controls are handled via rate limiting (below).

### Rate limiting
The chat endpoint enforces a simple per-user rate limit: max 20 requests per minute. This is implemented as a lightweight in-memory counter in the Hono middleware, checked before hitting OpenAI. This prevents runaway costs from a single user. More sophisticated limits (per-org, token-based) can be added later.

### AI SDK version
This spec targets AI SDK v5.x (`ai@^5.0.0`, `@ai-sdk/react@^5.0.0`, `@ai-sdk/openai@^1.0.0`). The `needsApproval`, `addToolApprovalResponse`, and `sendAutomaticallyWhen` APIs are based on the v5 documentation provided. Exact API names will be verified against installed package types during implementation.

## Data Flow

1. User types message in floating chat widget
2. `useChat` sends POST to `/api/chat` with `{ messages, context: { projectId, route } }`
3. Hono route validates auth via `requireOrg` middleware
4. Rate limit check (20 req/min per user)
5. `streamText` called with system prompt + tools
6. OpenAI decides which tools to call based on conversation
7. Tool `execute` functions call service layer with `orgId`/`userId`
8. Services perform DB operations, log activity, broadcast SSE
9. Tool results streamed back to client
10. For deletes: `needsApproval` pauses execution, client shows confirmation UI
11. User approves/denies, `addToolApprovalResponse` sent back
12. If approved, tool executes; conversation continues
13. Other dashboard clients receive SSE updates and refetch via React Query

## Error Handling

- Tool execution errors are caught and returned as tool error states
- `onError` in `toUIMessageStreamResponse` returns sanitized error messages
- Auth failures return 401 before reaching streamText
- Plan limit violations (e.g., max projects) are returned as tool results so the AI can explain the limit to the user
- Rate limit exceeded returns 429

## Files to Create

```
src/server/services/project-service.ts
src/server/services/section-service.ts
src/server/services/item-service.ts
src/server/services/note-service.ts
src/server/services/board-service.ts
src/server/services/activity-service.ts
src/server/services/project-link-service.ts
src/server/ai/tools.ts
src/server/routes/chat.ts
src/components/AiChat.tsx
```

## Files to Modify

```
src/server/app.ts                    — Register chat route
src/server/routes/projects.ts        — Refactor to use service layer
src/server/routes/sections.ts        — Refactor to use service layer
src/server/routes/items.ts           — Refactor to use service layer
src/server/routes/notes.ts           — Refactor to use service layer
src/server/routes/board.ts           — Refactor to use service layer
src/server/routes/activity.ts        — Refactor to use service layer
src/server/routes/project-links.ts   — Refactor to use service layer
src/app/dashboard/layout.tsx         — Add AiChat widget
package.json                         — Add ai, @ai-sdk/react, @ai-sdk/openai
.env.local                           — Add OPENAI_API_KEY
```
