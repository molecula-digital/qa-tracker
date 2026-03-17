# Assignee Feature + Mock Notification System

**Date:** 2026-03-17
**Status:** Approved

## Summary

Add multi-assignee support to items with an avatar stack display, a member picker popover, and a mock notification system (in-app bell + toasts + mock email logging). Assignees are organization members. Notifications fire on assignment, item changes, item completion, and note additions.

## Goals

- Items can have multiple assignees (organization members)
- Assignee picker: searchable popover showing org members with toggle selection
- Avatar display: single assignee shows avatar + name, multiple shows overlapping stack
- In-app notifications: bell icon with unread count, dropdown list, real-time toasts via SSE
- Mock email: logs to console, marks as sent in DB — no actual email delivery
- Notifications trigger on: assignment, item text/priority change, item check/uncheck, note added
- Actor is never notified of their own actions

## Non-Goals

- Real email delivery (mock only)
- Push notifications (browser/mobile)
- Notification preferences/settings
- @mention system

## Design

### 1. Database

**New table: `itemAssignee`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | text | PK, nanoid |
| `itemId` | text | FK → item, cascade delete |
| `userId` | text | FK → user |
| `assignedAt` | timestamp | default now |

Unique constraint on `(itemId, userId)`.

**New table: `notification`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | text | PK, nanoid |
| `userId` | text | FK → user (recipient) |
| `projectId` | text | FK → project |
| `itemId` | text | FK → item, nullable, on delete set null |
| `type` | enum | `assigned`, `item_updated`, `item_checked`, `note_added` |
| `title` | text | e.g. "You were assigned to: Fix login bug" |
| `body` | text | e.g. "John assigned you in Project Alpha" |
| `read` | boolean | default false |
| `emailSent` | boolean | default false |
| `createdAt` | timestamp | default now |

Index on `(userId, read, createdAt)` for efficient unread queries.

### 2. API endpoints

**Item assignee mutations:**
- `PUT /api/items/:id/assignees` — body: `{ assigneeIds: string[] }`. Replaces all assignees. Validates each userId is an org member. Returns updated assignee list.

**Board fetch changes:**
- Board service joins `itemAssignee` → `user` to include `assignees: { id, name, image }[]` per item.

**Notification endpoints:**
- `GET /api/notifications` — list for current user, ordered by `createdAt` desc, limit 50
- `PUT /api/notifications/:id/read` — mark single as read
- `PUT /api/notifications/read-all` — mark all as read for current user
- `GET /api/notifications/unread-count` — returns `{ count: number }`

**Members endpoint:**
- `GET /api/members` — list organization members: `{ id, name, email, image, role }[]`

### 3. Notification service

**File:** `src/server/services/notification-service.ts`

```ts
createNotification(userId, projectId, itemId, type, title, body)
```

- Inserts into `notification` table
- Calls mock email: `console.log("[EMAIL MOCK] To:", userEmail, "Subject:", title, "Body:", body)`
- Sets `emailSent: true`
- Broadcasts SSE `notification:new` to the recipient user

**Trigger points (in item-service):**

| Event | Type | Recipients | Skip |
|-------|------|-----------|------|
| Assignee added | `assigned` | New assignees only | Actor |
| Item text/priority changed | `item_updated` | All assignees | Actor |
| Item checked/unchecked | `item_checked` | All assignees | Actor |
| Note added | `note_added` | All assignees | Actor |

### 4. SSE changes

New patch types added to `SSEPatch` union:
- `item:assignees` — `{ sectionId, itemId, assignees: { id, name, image }[] }`

Existing patches updated:
- `item:create` data includes `assignees` array
- `item:update` data may include `assignees` when changed

New user-scoped broadcast:
- `notification:new` — sent only to the specific recipient's connections. Contains `{ id, type, title, body, projectId, itemId, createdAt }`.

The SSE manager needs a user-level subscription map (in addition to the existing project-level one) so notifications can target individual users across any project they're viewing.

### 5. Frontend types

Update `src/types/tracker.ts`:
```ts
export interface ItemAssignee {
  id: string
  name: string
  image: string | null
}

export interface Item {
  // ...existing fields
  assignees: ItemAssignee[]
}
```

### 6. Hooks

- `useMembers()` — `GET /api/members`, returns org member list for picker
- `useSetItemAssignees()` — `PUT /api/items/:id/assignees` mutation, invalidates board
- `useNotifications()` — `GET /api/notifications`, React Query with refetch on SSE
- `useUnreadCount()` — `GET /api/notifications/unread-count`, React Query
- `useMarkRead(id)` — `PUT /api/notifications/:id/read` mutation
- `useMarkAllRead()` — `PUT /api/notifications/read-all` mutation

### 7. AssigneePicker component

**File:** `src/components/board/AssigneePicker.tsx`

Popover with:
- Search input at top (filters members by name/email)
- Scrollable list of org members
- Each row: 24px avatar + name + email muted + checkmark if assigned
- Click toggles assignment
- Calls `useSetItemAssignees` with updated list on each toggle
- Closes on outside click

Triggered from ItemCard via a new `onOpenAssigneePicker` callback (same pattern as tag picker — curried at parent level).

### 8. Avatar display on ItemCard

**Card variant:**
- Shown in the footer area, left-aligned, next to action buttons
- Single assignee: 20px avatar + first name in `text-[10px] text-muted-foreground`
- Multiple: overlapping stack (20px, -6px margin), hover tooltip with all names
- No assignees: dashed circle "+" icon, visible on card hover

**Row variant:**
- Shown inline between text content and pills
- Same avatar logic but 18px circles for compactness

Both variants: clicking the avatar area opens AssigneePicker.

### 9. NotificationBell component

**File:** `src/components/NotificationBell.tsx`

- Bell icon (`Bell` from lucide) in the dashboard layout header
- Unread count badge: red dot with number if > 0
- Popover dropdown (320px wide):
  - Header: "Notifications" title + "Mark all read" button
  - Scrollable list of recent notifications (max 50)
  - Each item: type icon, title (bold if unread), body preview, time ago
  - Click → navigate to `/dashboard/projects/[projectId]` (and mark as read)
  - Empty state: "No notifications yet"
- Uses `useNotifications()` and `useUnreadCount()`

**Type icons:**
- `assigned` → `UserPlus`
- `item_updated` → `Pencil`
- `item_checked` → `CheckCircle2`
- `note_added` → `MessageSquare`

### 10. Toast notifications

When SSE receives `notification:new`:
- Show a toast (using a simple custom toast or existing toast system if available)
- Position: bottom-right
- Content: notification title + body preview
- Auto-dismiss: 5 seconds
- Click: navigate to project/item
- Increment unread count via query invalidation

### 11. Public page

No changes. Assignees are not shown on the public read-only page (the public board API already strips user data). Notifications are dashboard-only.

### 12. File changes

```
src/server/db/schema/
  itemAssignee.ts              (new)
  notification.ts              (new)
  index.ts                     (modified — export new schemas)
src/server/services/
  notification-service.ts      (new)
  item-service.ts              (modified — assignee + notification triggers)
  board-service.ts             (modified — join assignees)
src/server/routes/
  items.ts                     (modified — assignee endpoint)
  notifications.ts             (new)
  members.ts                   (new)
  index.ts                     (modified — register new routes)
src/server/lib/
  sse-manager.ts               (modified — user-level subscriptions, new patch types)
src/types/tracker.ts           (modified — ItemAssignee, update Item)
src/hooks/
  use-items.ts                 (modified — wire assignee mutation)
  use-members.ts               (new)
  use-notifications.ts         (new)
  use-sse.ts                   (modified — handle notification:new for toasts)
src/components/
  board/AssigneePicker.tsx     (new)
  board/ItemCard.tsx           (modified — avatar display + picker trigger)
  NotificationBell.tsx         (new)
  Toast.tsx                    (new — simple toast component, or use existing)
src/app/dashboard/
  layout.tsx                   (modified — add NotificationBell to header)
  projects/[id]/page.tsx       (modified — wire assignee callbacks, add picker state)
```
