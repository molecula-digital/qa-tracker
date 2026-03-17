# List View, Layout Selector & Shimmer Loading

**Date:** 2026-03-17
**Status:** Draft

## Summary

Add a list view mode alongside the existing kanban board, a layout selector in the header, and shimmer skeleton loading states for both views. Refactor shared logic out of KanbanBoard.tsx into a reusable hook and shared components so both views have full feature parity.

## Goals

- Users can switch between kanban (columns) and list (accordion) views
- Layout preference persists via cookie for SSR-friendly rendering (no flash)
- Both views support all existing features: inline edit, notes, priority, tags, sort, filter, drag-reorder sections, color/icon customization
- Real-time SSE sync works identically in both views
- Shimmer skeletons replace "Loading board..." text for both layouts
- KanbanBoard.tsx (954 lines) gets decomposed into focused, reusable pieces

## Non-Goals

- Changing the data model or API
- Modifying SSE or query cache behavior
- Adding new item/section features beyond what exists

## Design

### 1. Layout Persistence (Cookie)

A `view-layout` cookie stores `"kanban" | "list"`. Default: `"kanban"`.

- **Read:** The page component reads the cookie on mount via `document.cookie` parsing. Both the dashboard and public pages are `"use client"` components that rely on React Query and hooks, so server-side `cookies()` is not applicable here.
- **Write:** On layout toggle, set `document.cookie = "view-layout=list; path=/; max-age=31536000"`.
- Implemented inline in the page component — no separate hook needed for a single cookie.

### 2. Shared Hook: `useBoardLogic`

**File:** `src/hooks/use-board-logic.ts`

Extracted from KanbanBoard.tsx. Encapsulates filtering, sorting, and search matching.

```ts
// Exported from use-board-logic.ts — canonical location for this type
export interface ColumnSort {
  field: 'default' | 'priority' | 'date' | 'checked' | 'alpha'
  direction: 'asc' | 'desc'
}

interface UseBoardLogicParams {
  sections: Section[]
  search: string
  filters: BoardFilters
}

interface UseBoardLogicReturn {
  // Per-section sort state
  sortStates: Record<string, ColumnSort>
  setSortState: (sectionId: string, sort: ColumnSort) => void
  // Process a section's items through filter + sort + search
  // Looks up sort state internally by section.id
  processItems: (section: Section) => Item[]
  // Utilities
  matchesSearch: (item: Item) => boolean
}
```

This hook does NOT own mutation callbacks or optimistic updates — those stay in the page component since they depend on the query client.

**Default sort stability:** The current KanbanColumn uses a `useRef(lastSortedOrder)` to maintain stable ordering when sort is "default" (unchecked-first with preserved order). The hook must maintain a `useRef<Record<string, string[]>>` keyed by sectionId to preserve this behavior across both views.

**Moved into the hook from KanbanBoard.tsx:**
- `applyFilters()` function
- `applySorting()` function
- Search matching logic (currently inline in KanbanColumn)
- `ColumnSort` type (exported) and `PRIORITY_ORDER` constant
- `isWithinRange()` helper

**Stays in KanbanBoard.tsx (as shared constants file) or moves to a constants file:**
- `TAG_COLORS`, `PRIORITY_COLORS`, `PRIORITY_LABELS`, `SECTION_COLORS` — these are rendering concerns, exported from a shared `src/components/board/constants.ts`

### 3. Shared UI Components

Extracted from the current KanbanBoard.tsx monolith into `src/components/board/`:

#### `ItemCard.tsx`
The core item rendering — checkbox, editable text, tag badges, priority pill, note panel, action buttons. Accepts a `variant: "card" | "row"` prop:
- `"card"` — current kanban card style (rounded border, vertical-ish layout)
- `"row"` — horizontal row style for list view (full-width, more compact)

**Tag & priority pill styling (theme-aware, discrete):**
- **Tags (bug, question, later):** Colored dot + muted text only. No colored background. Text uses `text-muted-foreground`, dot uses the tag color. Blends with both light and dark themes.
- **Priority (low, medium, high):** Same discrete style — colored dot + `text-muted-foreground` text, no background tint.
- **Priority (urgent):** Distinctive treatment — the entire card/row gets a subtle red wash: `bg-red-500/3 border-red-500/20` (card) or left border accent `border-l-2 border-l-red-500/40` (row). The priority pill itself uses `text-red-500` with a slightly tinted background `bg-red-500/10`.

This replaces the current approach where all tags and priorities use `color + '15'` backgrounds.

**Props:** `item`, `sectionId`, `readOnly`, `variant`, and curried `on*` callbacks. The parent view (KanbanBoard or ListView) partially applies `sectionId` to create curried callbacks before passing them to ItemCard — matching the current KanbanCard pattern. ItemCard's `on*` props do NOT include `sectionId` in their signatures (e.g., `onToggle: () => void`, `onUpdateText: (text: string) => void`, `onOpenTagPicker: (anchorEl: HTMLButtonElement, item: Item) => void`). The `sectionId` prop is passed through only for context (e.g., key generation), not threaded into callbacks.

#### `SectionHeader.tsx`
Section title (editable), icon, color indicator, progress (done/total), sort menu, color picker submenu, icon picker submenu, delete option. Used as:
- Column header in kanban view
- Accordion trigger in list view (with chevron for expand/collapse)

#### `AddItemInput.tsx`
The "add item" input with optional priority/tag quick-set. Appears at the bottom of each section in both views.

#### `constants.ts`
Shared color maps, priority order, labels — exported for use by all board components.

#### `helpers.ts`
`renderTextWithLinks()`, `getHeaderColor()` — pure functions used by both views.

**Note:** `renderTextWithLinks` has a bug in the current code — the `/g` regex flag causes `.test()` to return alternating results due to stateful `lastIndex`. Fix during extraction: create the regex inside the function body so each call gets a fresh instance.

### 4. KanbanBoard Refactor

**File:** `src/components/KanbanBoard.tsx` (stays in place, re-exports types)

Slimmed to ~200-300 lines. Responsibilities:
- Horizontal scroll container with column layout
- Drag-to-reorder columns (existing drag state logic)
- Renders `SectionHeader` + `ItemCard variant="card"` + `AddItemInput` per column
- `AnimatePresence` for column enter/exit
- "Add section" dashed placeholder

Imports `useBoardLogic` for filtering/sorting. Imports shared components from `board/`.

Continues to export `BoardFilters`, `DEFAULT_FILTERS` for the page component (or these move to `board/constants.ts`).

### 5. ListView Component

**File:** `src/components/ListView.tsx`

Accordion-style vertical layout. ~200-300 lines.

```tsx
interface ListViewProps {
  // Same props as KanbanBoardProps
  sections: Section[]
  search: string
  newestSectionId: string | null
  readOnly?: boolean
  filters?: BoardFilters
  // All the same on* callbacks
  ...
}
```

**Structure:**
- Vertical stack of collapsible section panels
- Each section: `SectionHeader` as clickable trigger (with expand/collapse chevron)
- Expanded state shows items as `ItemCard variant="row"` in a vertical list
- `AddItemInput` at the bottom of each expanded section
- All sections expanded by default
- `AnimatePresence` for smooth expand/collapse animation
- Framer motion `layout` for reorder animations

**Section reordering:** Drag handle on section header (same as kanban column drag), but vertical instead of horizontal.

### 6. Layout Selector

Located in the page header, after the active filter pills and before the search toggle.

Two icon buttons side by side:
- `LayoutGrid` icon (lucide) — kanban view
- `List` icon (lucide) — list view
- Active view gets `bg-foreground/10 text-foreground` styling
- Inactive gets `text-muted-foreground hover:text-foreground`
- Wrapped in a small pill-shaped container with `bg-muted border border-border rounded-md`

```tsx
<div className="flex items-center bg-muted border border-border rounded-md">
  <button onClick={() => setLayout("kanban")} className={...}>
    <LayoutGrid size={14} />
  </button>
  <button onClick={() => setLayout("list")} className={...}>
    <List size={14} />
  </button>
</div>
```

### 7. Shimmer Skeletons

**File:** `src/components/BoardSkeleton.tsx`

Uses Tailwind `animate-pulse` on `bg-muted` shapes. Two variants:

#### `KanbanSkeleton`
- 3-4 horizontal columns (matching kanban column width ~300px)
- Each column: header rectangle (h-10) + 3-4 card rectangles (h-20, h-16, h-24 varied) with rounded corners
- Gap and padding matching real kanban layout

#### `ListSkeleton`
- 3 vertical section groups
- Each: header bar rectangle (h-10 full-width) + 4-5 row rectangles (h-12 full-width) with slight indent
- Varied widths on rows (80%, 65%, 90%) for visual interest

Both rendered based on current layout preference. Replaces `loadingBoard` text in the page component.

### 8. SSE / Real-Time Sync

**No changes.** The architecture already supports this:
- `useSSE(id)` is called at the page level, invalidates `["board", id]` query
- Both views consume `board?.sections` from the same React Query cache
- Optimistic updates (`optimisticBoard`, `rollbackBoard`) operate on the shared cache
- Layout switching is purely a rendering concern — data flow is unchanged

### 9. Public Page

The public page (`/p/[orgSlug]/[projectSlug]`) also uses `KanbanBoard` with `readOnly={true}`. It should also get the layout selector and shimmer. The cookie works there too since it's a client component. Both `KanbanBoard` and `ListView` disable section drag-reorder when `readOnly={true}`, and the public page passes no-op functions for all mutation callbacks — same pattern as today.

### 10. File Changes

```
src/
  hooks/
    use-board-logic.ts              (new)
  components/
    board/
      constants.ts                  (new — colors, labels, priority order)
      helpers.ts                    (new — renderTextWithLinks, getHeaderColor)
      ItemCard.tsx                  (new — extracted from KanbanCard)
      SectionHeader.tsx             (new — extracted from KanbanColumn header)
      AddItemInput.tsx              (new — extracted from KanbanColumn footer)
    KanbanBoard.tsx                 (refactored — ~300 lines, thin shell)
    ListView.tsx                    (new — accordion view ~300 lines)
    BoardSkeleton.tsx               (new — shimmer for both layouts)
    ItemRow.tsx                     (deleted — legacy)
  app/
    dashboard/projects/[id]/
      page.tsx                      (modified — layout selector, cookie, skeleton)
```

### 11. Migration Risk

The KanbanBoard refactor is the riskiest part — it touches a 954-line working component. Mitigation:
- Extract shared pieces first, verify kanban still works
- Then build list view on top of the shared pieces
- The public page uses the same component, so it gets tested implicitly
