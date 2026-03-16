# Priority Field, Filters, Sort & UX Improvements

**Date**: 2026-03-15
**Status**: Approved

## Overview

Add priority field to items, implement client-side filtering/sorting, improve item creation UX, and fix comment/edit interactions in the Kanban board.

---

## 1. Data Model: Priority Field

### Schema Change

New Postgres enum and nullable column on `item` table:

```sql
CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'urgent');
ALTER TABLE item ADD COLUMN priority priority DEFAULT NULL;
```

In `src/server/db/schema/items.ts`:

```ts
export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "urgent"]);
// Add to item table:
priority: priorityEnum("priority"),
```

### Type Change

In `src/types/tracker.ts`:

```ts
export type PriorityKey = "low" | "medium" | "high" | "urgent";

export interface Item {
  // ... existing fields
  priority: PriorityKey | null;
  createdAt?: number; // expose for date filtering
}
```

### Priority Colors

| Level    | Color     | Usage                          |
|----------|-----------|--------------------------------|
| `urgent` | `#e05555` | Red — critical items           |
| `high`   | `#e08a30` | Orange — important items       |
| `medium` | `#d4a020` | Yellow/gold — moderate items   |
| `low`    | `#8888a0` | Gray — low priority items      |

### Propagation

- `board-service.ts`: Include `priority` and `createdAt` in item response
- `item-service.ts`: Accept `priority` in create/update
- `items.ts` route: Accept `priority` in POST/PUT body
- `use-items.ts` hook: Pass `priority` in mutations
- SSE patches: Include `priority` field

---

## 2. Filter System

### Filter State

Managed in `page.tsx`, passed to `KanbanBoard`:

```ts
interface BoardFilters {
  priority: PriorityKey[];           // empty = show all
  checked: "all" | "checked" | "unchecked";
  tags: TagKey[];                    // empty = show all
  dateRange: "all" | "today" | "week" | "month";
}
```

### UI: Filter Popover

- **Trigger**: "Filter" button in the project page header bar, next to Search
- **Popover content**:
  - Priority: multi-select pills (low/medium/high/urgent)
  - Status: single-select (all/checked/unchecked)
  - Tags: multi-select pills (bug/question/later)
  - Date: single-select (all/today/this week/this month)
- **Active filter pills**: Shown next to Filter button when any filter is non-default, each with `×` to dismiss
- **Clear all**: Link shown when 2+ filters active

### Filtering Logic

Client-side in `KanbanColumn`. Applied before sort. Each filter is AND-combined:

```ts
let items = section.items
if (filters.priority.length > 0)
  items = items.filter(i => i.priority && filters.priority.includes(i.priority))
if (filters.checked !== "all")
  items = items.filter(i => filters.checked === "checked" ? i.checked : !i.checked)
if (filters.tags.length > 0)
  items = items.filter(i => i.tags.some(t => filters.tags.includes(t)))
if (filters.dateRange !== "all")
  items = items.filter(i => isWithinRange(i.createdAt, filters.dateRange))
```

---

## 3. Sort System

### Sort State

Per-column, local component state in `KanbanColumn` (not persisted):

```ts
interface ColumnSort {
  field: "default" | "priority" | "date" | "checked" | "alpha";
  direction: "asc" | "desc";
}
```

### UI: Sort Submenu

Inside the existing `...` dropdown menu per column:

- **"Sort by"** submenu with options:
  - Default (manual order) — current unchecked-first behavior
  - Priority (urgent first ↔ low first)
  - Creation date (newest first ↔ oldest first)
  - Status (unchecked first ↔ checked first)
  - Alphabetical (A-Z ↔ Z-A)
- Clicking an active sort option toggles direction
- Active sort shown with a subtle indicator icon in column header (next to count pill)

### Sort Logic

Applied after filtering. Replaces current hardcoded unchecked-first sort when non-default:

```ts
const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

function sortItems(items: Item[], sort: ColumnSort): Item[] {
  if (sort.field === "default") return defaultSort(items); // existing logic
  const dir = sort.direction === "asc" ? 1 : -1;
  return items.slice().sort((a, b) => {
    switch (sort.field) {
      case "priority":
        return dir * ((PRIORITY_ORDER[a.priority ?? "low"] ?? 4) - (PRIORITY_ORDER[b.priority ?? "low"] ?? 4));
      case "date":
        return dir * ((a.createdAt ?? 0) - (b.createdAt ?? 0));
      case "checked":
        return dir * (Number(a.checked) - Number(b.checked));
      case "alpha":
        return dir * a.text.localeCompare(b.text);
    }
  });
}
```

---

## 4. Add Item Modal

### Triggers

1. **`+` button in column header** — small icon button placed left of the `...` menu
2. Existing inline input at bottom of column **remains** for quick text-only adds

### Modal Content

- **Text**: Textarea (multiline, auto-sized)
- **Priority**: 4 pills (low/medium/high/urgent) + "None" option, single-select
- **Tags**: 3 pills (bug/question/later), multi-select
- **Actions**: "Add" (primary) and "Cancel" buttons

### Implementation

- Uses shadcn `Dialog` component
- `AddItemModal` component receives `sectionId`, `onSubmit`, `onClose`
- On submit: calls `onAddItem` with text, then immediately sets priority and tags via existing mutations (or extend `onAddItem` to accept all fields)

**Preferred approach**: Extend `createItem` API to accept optional `priority` and `tags` in a single request, avoiding multiple round-trips.

---

## 5. UX Fixes

### 5a. URL Parsing in Comments

Detect URLs in note text and render as clickable links:

```ts
function renderNoteText(text: string) {
  const urlRegex = /(https?:\/\/[^\s<>\"')\]]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{part}</a>
      : part
  );
}
```

No full markdown — just URL detection.

### 5b. Edit Mode Textarea Sizing

Current issue: `rows={1}` forces small initial size on edit.

Fix: Remove `rows={1}`, rely on `fieldSizing: 'content'` (already in code) so the textarea starts at the same height as the rendered text. The textarea will auto-expand as content grows.

### 5c. Copyable Comments

Current issue: Comment text cannot be selected/copied due to interaction model.

Fix: Ensure comment text `<p>` elements have `select-text` / `cursor-text` classes and are not wrapped in interactive elements that prevent selection. The delete button and other actions remain separate — text itself is purely selectable.

---

## 6. Files to Modify

| File | Changes |
|------|---------|
| `src/server/db/schema/items.ts` | Add `priorityEnum`, add `priority` column |
| `src/types/tracker.ts` | Add `PriorityKey`, update `Item` type |
| `src/server/services/board-service.ts` | Include `priority`, `createdAt` in response |
| `src/server/services/item-service.ts` | Accept `priority` in create/update, accept `tags` in create |
| `src/server/routes/items.ts` | Accept `priority` in POST/PUT, accept `tags` in POST |
| `src/hooks/use-items.ts` | Pass `priority`/`tags` in mutations |
| `src/components/KanbanBoard.tsx` | Filter logic, sort submenu, priority pills, URL parsing, edit textarea fix, copyable comments, add item header button |
| `src/app/dashboard/projects/[id]/page.tsx` | Filter state, filter popover UI, filter pills, pass filters to board, extend `handleAddItem` |
| New: `src/components/AddItemModal.tsx` | Modal dialog for rich item creation |
| DB migration | New enum + column |

---

## 7. Out of Scope

- Persisting sort preferences to DB
- Server-side filtering
- Custom priority labels
- Drag-reorder items within columns
- Full markdown in comments
