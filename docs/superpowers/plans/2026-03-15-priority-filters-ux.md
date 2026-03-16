# Priority, Filters, Sort & UX Improvements — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add priority field to items, implement client-side filtering/sorting with popover UI, add rich item creation modal, and fix comment/edit UX issues.

**Architecture:** Priority is a new DB enum column on `item`. Filtering is client-side in `KanbanColumn` using a `BoardFilters` object managed in `page.tsx`. Sorting is per-column local state inside `KanbanColumn`. A new `AddItemModal` component uses shadcn Dialog. UX fixes (URL parsing, textarea sizing, copyable comments) are contained within `KanbanBoard.tsx`.

**Tech Stack:** Drizzle ORM (Postgres), Next.js 16, React 19, @base-ui/react, Hono, TanStack Query, Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/server/db/schema/items.ts` | Modify | Add `priorityEnum` and `priority` column |
| `src/types/tracker.ts` | Modify | Add `PriorityKey`, update `Item` type with `priority` and `createdAt` |
| `src/server/services/board-service.ts` | Modify | Include `priority` and `createdAt` in item response |
| `src/server/services/item-service.ts` | Modify | Accept `priority` + `tags` in `createItem`, `priority` in `updateItem` |
| `src/server/routes/items.ts` | Modify | Accept `priority` in POST/PUT schemas, `tags` in POST |
| `src/hooks/use-items.ts` | Modify | Add `priority` and `tags` to create mutation, `priority` to update mutation |
| `src/hooks/use-sse.ts` | Modify | Include `priority` and `createdAt` in `item:create` patch type |
| `src/components/KanbanBoard.tsx` | Modify | Filters, sort submenu, priority pills, URL parsing, textarea fix, copyable comments, header add button |
| `src/components/AddItemModal.tsx` | Create | Modal dialog for rich item creation with text + priority + tags |
| `src/app/dashboard/projects/[id]/page.tsx` | Modify | Filter state, filter popover, filter pills, pass filters + priority to board, extend handleAddItem |
| DB migration (via `pnpm db:generate`) | Generate | New `priority` enum + column |

---

## Chunk 1: Data Layer (Schema, Services, API, Hooks)

### Task 1: Add priority enum and column to DB schema

**Files:**
- Modify: `src/server/db/schema/items.ts`

- [ ] **Step 1: Add priority enum and column**

In `src/server/db/schema/items.ts`, add the enum after the existing `tagEnum` (line 4) and add the column to the `item` table:

```ts
export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "urgent"]);
```

Add to the `item` table definition (after `order` field, line 11):

```ts
priority: priorityEnum("priority"),
```

- [ ] **Step 2: Generate migration**

Run: `pnpm db:generate`
Expected: New migration SQL file created in `drizzle/` with `CREATE TYPE priority` and `ALTER TABLE item ADD COLUMN priority`

- [ ] **Step 3: Push schema to DB**

Run: `pnpm db:push`
Expected: Schema changes applied successfully

- [ ] **Step 4: Commit**

```bash
git add src/server/db/schema/items.ts drizzle/
git commit -m "feat: add priority enum and column to item schema"
```

---

### Task 2: Update types

**Files:**
- Modify: `src/types/tracker.ts`

- [ ] **Step 1: Add PriorityKey and update Item type**

In `src/types/tracker.ts`, add after line 1 (`TagKey`):

```ts
export type PriorityKey = 'low' | 'medium' | 'high' | 'urgent'
```

Update `Item` interface to add `priority` and `createdAt`:

```ts
export interface Item {
  id: string
  text: string
  checked: boolean
  tags: TagKey[]
  notes: Note[]
  priority: PriorityKey | null
  createdAt?: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/tracker.ts
git commit -m "feat: add PriorityKey type and priority/createdAt to Item"
```

---

### Task 3: Update board-service to include priority and createdAt

**Files:**
- Modify: `src/server/services/board-service.ts`

- [ ] **Step 1: Add priority and createdAt to getBoard response**

In `board-service.ts`, update the item mapping inside `getBoard` (lines 62-68). Change from:

```ts
    arr.push({
      id: i.id,
      text: i.text,
      checked: i.checked,
      tags: tagsByItem.get(i.id) ?? [],
      notes: notesByItem.get(i.id) ?? [],
    });
```

To:

```ts
    arr.push({
      id: i.id,
      text: i.text,
      checked: i.checked,
      priority: i.priority ?? null,
      createdAt: new Date(i.createdAt).getTime(),
      tags: tagsByItem.get(i.id) ?? [],
      notes: notesByItem.get(i.id) ?? [],
    });
```

- [ ] **Step 2: Add priority to getBoardForAI response**

In `getBoardForAI` (lines 138-144), change from:

```ts
    arr.push({
      id: i.id,
      text: i.text,
      checked: i.checked,
      tags: tagsByItem.get(i.id) ?? [],
      noteCount: noteCountMap.get(i.id) ?? 0,
    });
```

To:

```ts
    arr.push({
      id: i.id,
      text: i.text,
      checked: i.checked,
      priority: i.priority ?? null,
      tags: tagsByItem.get(i.id) ?? [],
      noteCount: noteCountMap.get(i.id) ?? 0,
    });
```

- [ ] **Step 3: Commit**

```bash
git add src/server/services/board-service.ts
git commit -m "feat: include priority and createdAt in board response"
```

---

### Task 4: Update item-service to accept priority and tags on create

**Files:**
- Modify: `src/server/services/item-service.ts`

- [ ] **Step 1: Update createItem signature and logic**

In `item-service.ts`, change the `createItem` data parameter type (line 53) from:

```ts
  data: { sectionId: string; text: string; order?: number }
```

To:

```ts
  data: { sectionId: string; text: string; order?: number; priority?: "low" | "medium" | "high" | "urgent"; tags?: ("bug" | "question" | "later")[] }
```

In the `db.insert(item).values(...)` call (lines 63-71), add priority:

```ts
    .values({
      id,
      sectionId: data.sectionId,
      text: data.text,
      checked: false,
      order: data.order ?? 0,
      priority: data.priority ?? null,
      createdAt: now,
      updatedAt: now,
    })
```

After inserting the item and before the SSE broadcast (after line 72), add tag insertion:

```ts
  if (data.tags && data.tags.length > 0) {
    await db.insert(itemTag).values(
      data.tags.map((tag) => ({
        id: crypto.randomUUID(),
        itemId: id,
        tag,
      }))
    );
  }
```

Update the SSE broadcast data (line 79) to include priority and tags:

```ts
      data: { id, text: data.text, checked: false, priority: data.priority ?? null, tags: data.tags ?? [], notes: [] as never[] },
```

Update the return (line 92) to include tags:

```ts
  return { ...row, tags: data.tags ?? [] };
```

- [ ] **Step 2: Update updateItem to accept priority**

In `updateItem` (line 100), change the data parameter type from:

```ts
  data: { text?: string; checked?: boolean; order?: number; sectionId?: string }
```

To:

```ts
  data: { text?: string; checked?: boolean; order?: number; sectionId?: string; priority?: "low" | "medium" | "high" | "urgent" | null }
```

Update the SSE broadcast data (line 123) to include priority:

```ts
      data: { text: row.text, checked: row.checked, priority: row.priority ?? null },
```

- [ ] **Step 3: Commit**

```bash
git add src/server/services/item-service.ts
git commit -m "feat: accept priority and tags in createItem, priority in updateItem"
```

---

### Task 5: Update API routes to accept priority and tags

**Files:**
- Modify: `src/server/routes/items.ts`

- [ ] **Step 1: Update POST schema**

In `items.ts`, update the POST zod schema (lines 28-32) from:

```ts
    z.object({
      sectionId: z.string().min(1),
      text: z.string().min(1).max(500),
      order: z.number().int().optional(),
    })
```

To:

```ts
    z.object({
      sectionId: z.string().min(1),
      text: z.string().min(1).max(500),
      order: z.number().int().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      tags: z.array(z.enum(["bug", "question", "later"])).optional(),
    })
```

- [ ] **Step 2: Update PUT schema**

Update the PUT zod schema (lines 51-56) from:

```ts
    z.object({
      text: z.string().min(1).max(500).optional(),
      checked: z.boolean().optional(),
      order: z.number().int().optional(),
      sectionId: z.string().min(1).optional(),
    })
```

To:

```ts
    z.object({
      text: z.string().min(1).max(500).optional(),
      checked: z.boolean().optional(),
      order: z.number().int().optional(),
      sectionId: z.string().min(1).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).nullable().optional(),
    })
```

- [ ] **Step 3: Commit**

```bash
git add src/server/routes/items.ts
git commit -m "feat: accept priority and tags in item API routes"
```

---

### Task 6: Update hooks

**Files:**
- Modify: `src/hooks/use-items.ts`

- [ ] **Step 1: Update useCreateItem mutation type**

In `use-items.ts`, update `useCreateItem` mutationFn data type (lines 33-36) from:

```ts
    mutationFn: (data: {
      sectionId: string;
      text: string;
      order?: number;
    }) =>
```

To:

```ts
    mutationFn: (data: {
      sectionId: string;
      text: string;
      order?: number;
      priority?: "low" | "medium" | "high" | "urgent";
      tags?: ("bug" | "question" | "later")[];
    }) =>
```

- [ ] **Step 2: Update useUpdateItem mutation type**

In `useUpdateItem`, update the vars type (lines 52-58) to add:

```ts
      priority?: "low" | "medium" | "high" | "urgent" | null;
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-items.ts
git commit -m "feat: add priority and tags to item hook mutation types"
```

---

### Task 7: Update SSE patch types for priority

**Files:**
- Modify: `src/hooks/use-sse.ts`

- [ ] **Step 1: Update item:create patch**

In `use-sse.ts`, update the `item:create` case (lines 56-64). Change the type assertion (line 57) from:

```ts
      const d = patch.data as { id: string; text: string; checked: boolean; tags: string[]; notes: never[] };
```

To:

```ts
      const d = patch.data as { id: string; text: string; checked: boolean; priority: string | null; tags: string[]; notes: never[] };
```

Update the object spread in the map (line 61) to include priority and createdAt:

```ts
            ? { ...s, items: [...s.items, { id: d.id, text: d.text, checked: d.checked, priority: (d.priority ?? null) as Item["priority"], createdAt: Date.now(), tags: d.tags as Item["tags"], notes: [] }] }
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-sse.ts
git commit -m "feat: include priority in SSE item:create patch"
```

---

## Chunk 2: UI Components (KanbanBoard, AddItemModal, Filters, Sort)

### Task 8: Add AddItemModal component

**Files:**
- Create: `src/components/AddItemModal.tsx`

- [ ] **Step 1: Create AddItemModal**

Create `src/components/AddItemModal.tsx`:

```tsx
import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { TagKey, PriorityKey } from '@/types/tracker'

const PRIORITY_OPTIONS: { value: PriorityKey; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#8888a0' },
  { value: 'medium', label: 'Medium', color: '#d4a020' },
  { value: 'high', label: 'High', color: '#e08a30' },
  { value: 'urgent', label: 'Urgent', color: '#e05555' },
]

const TAG_OPTIONS: { value: TagKey; label: string; color: string }[] = [
  { value: 'bug', label: 'Bug', color: '#e05555' },
  { value: 'question', label: 'Question', color: '#d4a020' },
  { value: 'later', label: 'Later', color: '#4a8ae0' },
]

interface AddItemModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { text: string; priority?: PriorityKey; tags?: TagKey[] }) => void
}

export function AddItemModal({ open, onClose, onSubmit }: AddItemModalProps) {
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<PriorityKey | null>(null)
  const [tags, setTags] = useState<TagKey[]>([])

  const handleSubmit = () => {
    const v = text.trim()
    if (!v) return
    onSubmit({
      text: v,
      priority: priority ?? undefined,
      tags: tags.length > 0 ? tags : undefined,
    })
    setText('')
    setPriority(null)
    setTags([])
    onClose()
  }

  const toggleTag = (tag: TagKey) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Text */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
            className="w-full text-sm border border-border rounded-lg bg-transparent px-3 py-2 outline-none text-foreground font-[inherit] resize-none focus:ring-1 focus:ring-ring/30 transition-colors min-h-[80px]"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
            }}
          />

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Priority</label>
            <div className="flex gap-1.5">
              {PRIORITY_OPTIONS.map((p) => {
                const active = priority === p.value
                return (
                  <button
                    key={p.value}
                    onClick={() => setPriority(active ? null : p.value)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors"
                    style={{
                      background: active ? p.color + '20' : 'transparent',
                      color: active ? p.color : 'var(--muted-foreground)',
                      borderColor: active ? p.color + '40' : 'var(--border)',
                    }}
                  >
                    <span style={{ background: p.color }} className="w-1.5 h-1.5 rounded-full" />
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Tags</label>
            <div className="flex gap-1.5">
              {TAG_OPTIONS.map((t) => {
                const active = tags.includes(t.value)
                return (
                  <button
                    key={t.value}
                    onClick={() => toggleTag(t.value)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors"
                    style={{
                      background: active ? t.color + '20' : 'transparent',
                      color: active ? t.color : 'var(--muted-foreground)',
                      borderColor: active ? t.color + '40' : 'var(--border)',
                    }}
                  >
                    <span style={{ background: t.color }} className="w-1.5 h-1.5 rounded-full" />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!text.trim()}>Add item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AddItemModal.tsx
git commit -m "feat: add AddItemModal component with priority and tag selection"
```

---

### Task 9: Update KanbanBoard — priority pills, URL parsing, textarea fix, copyable comments, sort, header add button

**Files:**
- Modify: `src/components/KanbanBoard.tsx`

This is the largest task. It modifies `KanbanBoard.tsx` with several independent changes.

- [ ] **Step 1: Add imports and constants**

At the top of `KanbanBoard.tsx`, add to the lucide imports (line 3):

```ts
import { Tag, MessageSquare, ClipboardList, CheckCircle2, Trash2, Plus, Sparkles, Palette, MoreHorizontal, ChevronsDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
```

Add import for the new types (line 4):

```ts
import type { Section, Item, TagKey, PriorityKey, Note } from '../types/tracker'
```

Add import for AddItemModal after the dropdown-menu import (line 18):

```ts
import { AddItemModal } from './AddItemModal'
```

Add priority colors constant after `TAG_COLORS` (after line 35):

```ts
const PRIORITY_COLORS: Record<PriorityKey, string> = {
  urgent: '#e05555',
  high: '#e08a30',
  medium: '#d4a020',
  low: '#8888a0',
}

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0, high: 1, medium: 2, low: 3,
}

const PRIORITY_LABELS: Record<PriorityKey, string> = {
  urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low',
}
```

- [ ] **Step 2: Add BoardFilters and ColumnSort types, add filters prop to KanbanBoard**

Add types before the KanbanBoardProps interface (before line 52):

```ts
export interface BoardFilters {
  priority: PriorityKey[]
  checked: 'all' | 'checked' | 'unchecked'
  tags: TagKey[]
  dateRange: 'all' | 'today' | 'week' | 'month'
}

interface ColumnSort {
  field: 'default' | 'priority' | 'date' | 'checked' | 'alpha'
  direction: 'asc' | 'desc'
}

export const DEFAULT_FILTERS: BoardFilters = {
  priority: [],
  checked: 'all',
  tags: [],
  dateRange: 'all',
}
```

Add `filters` prop to `KanbanBoardProps` (after `readOnly?: boolean` on line 55):

```ts
  filters?: BoardFilters
```

Update `onAddItem` callback type from:

```ts
  onAddItem: (sectionId: string, text: string) => void
```

To:

```ts
  onAddItem: (sectionId: string, text: string, priority?: PriorityKey, tags?: TagKey[]) => void
```

Pass `filters` through in the KanbanBoard function signature and pass it to each `KanbanColumn`.

- [ ] **Step 3: Add URL parsing helper function**

Add after the constants block (after PRIORITY_LABELS):

```ts
function renderTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s<>"')\]]+)/g
  const parts = text.split(urlRegex)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{part}</a>
      : part
  )
}
```

- [ ] **Step 4: Add filter and sort helpers**

Add after `renderTextWithLinks`:

```ts
function isWithinRange(ts: number | undefined, range: 'today' | 'week' | 'month'): boolean {
  if (!ts) return false
  const now = Date.now()
  const diff = now - ts
  switch (range) {
    case 'today': return diff < 86_400_000
    case 'week': return diff < 604_800_000
    case 'month': return diff < 2_592_000_000
  }
}

function applyFilters(items: Item[], filters: BoardFilters): Item[] {
  let result = items
  if (filters.priority.length > 0)
    result = result.filter((i) => i.priority != null && filters.priority.includes(i.priority))
  if (filters.checked !== 'all')
    result = result.filter((i) => filters.checked === 'checked' ? i.checked : !i.checked)
  if (filters.tags.length > 0)
    result = result.filter((i) => i.tags.some((t) => filters.tags.includes(t)))
  if (filters.dateRange !== 'all')
    result = result.filter((i) => isWithinRange(i.createdAt, filters.dateRange))
  return result
}

function applySorting(items: Item[], sort: ColumnSort): Item[] {
  if (sort.field === 'default') return items
  const dir = sort.direction === 'asc' ? 1 : -1
  return items.slice().sort((a, b) => {
    switch (sort.field) {
      case 'priority':
        return dir * ((PRIORITY_ORDER[a.priority ?? ''] ?? 4) - (PRIORITY_ORDER[b.priority ?? ''] ?? 4))
      case 'date':
        return dir * ((a.createdAt ?? 0) - (b.createdAt ?? 0))
      case 'checked':
        return dir * (Number(a.checked) - Number(b.checked))
      case 'alpha':
        return dir * a.text.localeCompare(b.text)
      default:
        return 0
    }
  })
}
```

- [ ] **Step 5: Update KanbanColumn — add filters, sort state, add-item modal, sort submenu**

In `KanbanColumnProps`, add:

```ts
  filters?: BoardFilters
  onAddItem: (text: string, priority?: PriorityKey, tags?: TagKey[]) => void
```

In the `KanbanColumn` function, add state after existing state declarations (after line 200):

```ts
  const [sort, setSort] = useState<ColumnSort>({ field: 'default', direction: 'asc' })
  const [addModalOpen, setAddModalOpen] = useState(false)
```

Replace the existing `filtered` computation (lines 209-224) with:

```ts
  const filtered = (() => {
    let items = section.items.filter(
      (i) => !search || i.text.toLowerCase().includes(search.toLowerCase()),
    )

    // Apply board-level filters
    if (filters) {
      items = applyFilters(items, filters)
    }

    // Apply sort
    if (sort.field !== 'default') {
      return applySorting(items, sort)
    }

    // Default sort: unchecked first
    const hasUnchecked = items.some((i) => !i.checked)
    if (hasUnchecked) {
      const sorted = items.slice().sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? 1 : -1))
      lastSortedOrder.current = sorted.map((i) => i.id)
      return sorted
    }
    if (lastSortedOrder.current.length > 0) {
      const pos = new Map(lastSortedOrder.current.map((id, idx) => [id, idx]))
      return items.slice().sort((a, b) => (pos.get(a.id) ?? 999) - (pos.get(b.id) ?? 999))
    }
    return items
  })()
```

- [ ] **Step 6: Add "+" button in column header and sort indicator**

In the column header JSX, add a `+` button before the `...` menu (before the `{!readOnly && (` DropdownMenu block, around line 310):

```tsx
        {!readOnly && (
          <button
            onClick={(e) => { e.stopPropagation(); setAddModalOpen(true) }}
            onMouseDown={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center w-6 h-5 rounded text-muted-foreground hover:text-foreground shrink-0 outline-none"
            title="Add item"
          >
            <Plus size={14} />
          </button>
        )}
```

Add sort indicator after the count pill (after line 307), only when sort is non-default:

```tsx
        {sort.field !== 'default' && (
          <span className="flex items-center text-muted-foreground/60 shrink-0" title={`Sorted by ${sort.field}`}>
            {sort.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
          </span>
        )}
```

- [ ] **Step 7: Add sort submenu to the existing dropdown menu**

Inside the `DropdownMenuContent` of the `...` menu, add a "Sort by" submenu before the color submenu (before line 320):

```tsx
              {/* Sort submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <ArrowUpDown size={14} />
                  Sort by
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  {([
                    { field: 'default', label: 'Default' },
                    { field: 'priority', label: 'Priority' },
                    { field: 'date', label: 'Creation date' },
                    { field: 'checked', label: 'Status' },
                    { field: 'alpha', label: 'Alphabetical' },
                  ] as const).map((opt) => (
                    <DropdownMenuItem
                      key={opt.field}
                      onClick={() => {
                        if (sort.field === opt.field && opt.field !== 'default') {
                          setSort({ field: opt.field, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
                        } else {
                          setSort({ field: opt.field, direction: 'asc' })
                        }
                      }}
                      className="gap-2 justify-between"
                    >
                      <span>{opt.label}</span>
                      {sort.field === opt.field && opt.field !== 'default' && (
                        <span className="text-[10px] text-muted-foreground">
                          {sort.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                      {sort.field === opt.field && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
```

- [ ] **Step 8: Add AddItemModal render at bottom of KanbanColumn**

At the bottom of the KanbanColumn return, just before the closing `</div>`, add:

```tsx
      {addModalOpen && (
        <AddItemModal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onSubmit={({ text, priority, tags }) => {
            onAddItem(text, priority, tags)
            setAddModalOpen(false)
          }}
        />
      )}
```

- [ ] **Step 9: Commit**

```bash
git add src/components/KanbanBoard.tsx
git commit -m "feat: add filters, sort, priority pills, add-item modal trigger to KanbanBoard"
```

---

### Task 10: KanbanCard UX fixes — priority pills, URL parsing, textarea, copyable comments

**Files:**
- Modify: `src/components/KanbanBoard.tsx` (KanbanCard section)

- [ ] **Step 1: Add priority pill to KanbanCard**

In KanbanCard, add a priority pill after the tag pills block (after line 634, the closing `</div>` of tag pills). Add between the tag pills and footer actions:

```tsx
      {/* Priority pill */}
      {item.priority && (
        <div className="pl-7">
          <span
            style={{
              background: PRIORITY_COLORS[item.priority] + '15',
              color: PRIORITY_COLORS[item.priority],
              borderColor: PRIORITY_COLORS[item.priority] + '30',
            }}
            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border"
          >
            <span style={{ background: PRIORITY_COLORS[item.priority] }} className="w-1.5 h-1.5 rounded-full" />
            {PRIORITY_LABELS[item.priority]}
          </span>
        </div>
      )}
```

- [ ] **Step 2: Fix textarea sizing in edit mode**

In KanbanCard, find the edit mode textarea (around line 571). Remove `rows={1}` — change:

```tsx
            rows={1}
            className="flex-1 text-[13px] leading-relaxed border border-border rounded-md bg-kanban-input-bg px-1.5 py-0.5 outline-none text-foreground font-[inherit] resize-none focus:ring-1 focus:ring-ring/30 transition-colors"
```

To:

```tsx
            className="flex-1 text-[13px] leading-relaxed border border-border rounded-md bg-kanban-input-bg px-1.5 py-0.5 outline-none text-foreground font-[inherit] resize-none focus:ring-1 focus:ring-ring/30 transition-colors"
```

(Simply remove the `rows={1}` line. The `fieldSizing: 'content'` style on line 583 handles auto-sizing.)

- [ ] **Step 3: Apply URL parsing to comments**

In KanbanCard, find the note text rendering (line 690):

```tsx
                          <p className="text-[11px] text-foreground/80 leading-relaxed m-0 wrap-break-word">{note.text}</p>
```

Change to:

```tsx
                          <p className="text-[11px] text-foreground/80 leading-relaxed m-0 wrap-break-word select-text cursor-text">{renderTextWithLinks(note.text)}</p>
```

This both parses URLs and makes text selectable/copyable (via `select-text cursor-text`).

- [ ] **Step 4: Commit**

```bash
git add src/components/KanbanBoard.tsx
git commit -m "feat: add priority pills, fix textarea sizing, URL parsing and copyable comments"
```

---

### Task 11: Update page.tsx — filter state, filter popover, extended handleAddItem

**Files:**
- Modify: `src/app/dashboard/projects/[id]/page.tsx`

- [ ] **Step 1: Add imports**

Add to the lucide imports (line 7):

```ts
import { Filter, X as XIcon } from 'lucide-react'
```

(Note: `X` may conflict with existing import — use `XIcon` alias or check existing imports. The file already imports `X` on line 7 so just reuse it.)

Add new component imports:

```ts
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { type BoardFilters, DEFAULT_FILTERS } from '@/components/KanbanBoard'
import type { PriorityKey } from '@/types/tracker'
```

- [ ] **Step 2: Add filter state**

In the `ProjectPage` component, after the `tagPickerState` state (line 438), add:

```ts
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_FILTERS);

  const hasActiveFilters = filters.priority.length > 0 || filters.checked !== 'all' || filters.tags.length > 0 || filters.dateRange !== 'all';

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const toggleFilterPriority = (p: PriorityKey) => {
    setFilters((f) => ({
      ...f,
      priority: f.priority.includes(p) ? f.priority.filter((x) => x !== p) : [...f.priority, p],
    }));
  };

  const toggleFilterTag = (t: TagKey) => {
    setFilters((f) => ({
      ...f,
      tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t],
    }));
  };
```

- [ ] **Step 3: Update handleAddItem to accept priority and tags**

Change `handleAddItem` (lines 548-572) from:

```ts
  const handleAddItem = useCallback(
    (sectionId: string, text: string) => {
      const prev = optimisticBoard((old) => ({
        sections: old.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                items: [
                  ...s.items,
                  { id: crypto.randomUUID(), text, checked: false, tags: [], notes: [] },
                ],
              }
            : s
        ),
      }));
      createItem.mutate(
        { sectionId, text },
```

To:

```ts
  const handleAddItem = useCallback(
    (sectionId: string, text: string, priority?: PriorityKey, tags?: TagKey[]) => {
      const prev = optimisticBoard((old) => ({
        sections: old.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                items: [
                  ...s.items,
                  { id: crypto.randomUUID(), text, checked: false, priority: priority ?? null, createdAt: Date.now(), tags: tags ?? [], notes: [] },
                ],
              }
            : s
        ),
      }));
      createItem.mutate(
        { sectionId, text, priority, tags },
```

- [ ] **Step 4: Add filter popover button to header**

In the header bar, add the filter button before the search toggle (before line 849, the `{/* Search toggle */}` comment):

```tsx
        {/* Filter */}
        <Popover>
          <PopoverTrigger
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs transition-colors ${
              hasActiveFilters
                ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Filter size={12} />
            <span>Filter</span>
            {hasActiveFilters && (
              <span className="ml-0.5 w-4 h-4 rounded-full bg-emerald-500 text-[10px] text-white flex items-center justify-center font-medium">
                {filters.priority.length + (filters.checked !== 'all' ? 1 : 0) + filters.tags.length + (filters.dateRange !== 'all' ? 1 : 0)}
              </span>
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Filters</span>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-[11px] text-muted-foreground hover:text-foreground">
                    Clear all
                  </button>
                )}
              </div>

              {/* Priority filter */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Priority</span>
                <div className="flex flex-wrap gap-1.5">
                  {(['low', 'medium', 'high', 'urgent'] as const).map((p) => {
                    const active = filters.priority.includes(p)
                    const colors: Record<string, string> = { urgent: '#e05555', high: '#e08a30', medium: '#d4a020', low: '#8888a0' }
                    return (
                      <button
                        key={p}
                        onClick={() => toggleFilterPriority(p)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors"
                        style={{
                          background: active ? colors[p] + '20' : 'transparent',
                          color: active ? colors[p] : 'var(--muted-foreground)',
                          borderColor: active ? colors[p] + '40' : 'var(--border)',
                        }}
                      >
                        <span style={{ background: colors[p] }} className="w-1.5 h-1.5 rounded-full" />
                        {p}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Status filter */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Status</span>
                <div className="flex gap-1.5">
                  {(['all', 'unchecked', 'checked'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilters((f) => ({ ...f, checked: s }))}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                        filters.checked === s
                          ? 'bg-foreground/10 text-foreground border-foreground/20'
                          : 'text-muted-foreground border-border hover:text-foreground'
                      }`}
                    >
                      {s === 'all' ? 'All' : s === 'checked' ? 'Done' : 'To do'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag filter */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Tags</span>
                <div className="flex gap-1.5">
                  {(['bug', 'question', 'later'] as const).map((t) => {
                    const active = filters.tags.includes(t)
                    const colors: Record<string, string> = { bug: '#e05555', question: '#d4a020', later: '#4a8ae0' }
                    return (
                      <button
                        key={t}
                        onClick={() => toggleFilterTag(t)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors"
                        style={{
                          background: active ? colors[t] + '20' : 'transparent',
                          color: active ? colors[t] : 'var(--muted-foreground)',
                          borderColor: active ? colors[t] + '40' : 'var(--border)',
                        }}
                      >
                        <span style={{ background: colors[t] }} className="w-1.5 h-1.5 rounded-full" />
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Date filter */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Created</span>
                <div className="flex gap-1.5">
                  {(['all', 'today', 'week', 'month'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setFilters((f) => ({ ...f, dateRange: d }))}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                        filters.dateRange === d
                          ? 'bg-foreground/10 text-foreground border-foreground/20'
                          : 'text-muted-foreground border-border hover:text-foreground'
                      }`}
                    >
                      {d === 'all' ? 'All' : d === 'today' ? 'Today' : d === 'week' ? 'This week' : 'This month'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
```

- [ ] **Step 5: Add active filter pills**

After the filter popover (and before the search toggle), add dismissible pills:

```tsx
        {/* Active filter pills */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1 overflow-x-auto">
            {filters.priority.map((p) => (
              <button
                key={p}
                onClick={() => toggleFilterPriority(p)}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted border border-border text-foreground shrink-0"
              >
                {p} <X size={10} />
              </button>
            ))}
            {filters.checked !== 'all' && (
              <button
                onClick={() => setFilters((f) => ({ ...f, checked: 'all' }))}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted border border-border text-foreground shrink-0"
              >
                {filters.checked === 'checked' ? 'Done' : 'To do'} <X size={10} />
              </button>
            )}
            {filters.tags.map((t) => (
              <button
                key={t}
                onClick={() => toggleFilterTag(t)}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted border border-border text-foreground shrink-0"
              >
                {t} <X size={10} />
              </button>
            ))}
            {filters.dateRange !== 'all' && (
              <button
                onClick={() => setFilters((f) => ({ ...f, dateRange: 'all' }))}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted border border-border text-foreground shrink-0"
              >
                {filters.dateRange} <X size={10} />
              </button>
            )}
          </div>
        )}
```

- [ ] **Step 6: Pass filters to KanbanBoard**

In the `KanbanBoard` component invocation (around line 914), add the `filters` prop:

```tsx
              <KanbanBoard
                sections={sections}
                search={search}
                newestSectionId={newestSectionId}
                filters={filters}
                onToggleItem={handleToggleItem}
                ...
```

- [ ] **Step 7: Add Filter import from lucide**

Make sure `Filter` is added to the lucide-react import on line 7. The existing import is:

```ts
import {
  Search, Plus, X, CheckCircle2, LayoutGrid, ListTodo,
  Activity, Clock, User, TrendingUp, Copy, ExternalLink, Check,
} from "lucide-react";
```

Add `Filter, ArrowUpDown` to the list.

- [ ] **Step 8: Commit**

```bash
git add src/app/dashboard/projects/[id]/page.tsx
git commit -m "feat: add filter popover, filter pills, and extended handleAddItem in project page"
```

---

### Task 12: Build verification

- [ ] **Step 1: Run build**

Run: `pnpm build`
Expected: Build succeeds with no type errors

- [ ] **Step 2: Fix any type errors**

If there are type errors, fix them. Common issues:
- Missing `priority` in optimistic update objects
- Missing `createdAt` in optimistic update objects
- Type mismatches in callback signatures

- [ ] **Step 3: Run dev server and verify**

Run: `pnpm dev`
Verify manually:
- New filter button appears in header
- Filter popover opens with all 4 filter types
- Sort submenu appears in column `...` menu
- `+` button appears in column header, opens modal
- Priority pills display on items with priority set
- Comments are selectable/copyable
- URLs in comments are clickable
- Edit textarea matches display text height

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve build issues from priority/filter feature"
```
