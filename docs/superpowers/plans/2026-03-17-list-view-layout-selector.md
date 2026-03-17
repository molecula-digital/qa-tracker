# List View, Layout Selector & Shimmer Loading — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a list view alongside the kanban board, a layout toggle in the header, shimmer loading skeletons, and decompose KanbanBoard.tsx into shared components.

**Architecture:** Extract shared constants, helpers, and a `useBoardLogic` hook from KanbanBoard.tsx. Build shared UI components (ItemCard, SectionHeader, AddItemInput) that both views consume. KanbanBoard becomes a thin shell; ListView is a new accordion-style component. A cookie-persisted layout toggle switches between them.

**Tech Stack:** React 19, Next.js 15, Tailwind CSS v4, framer-motion, lucide-react, React Query, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-17-list-view-layout-selector-design.md`

---

## File Structure

```
src/
  hooks/
    use-board-logic.ts              (new — shared filtering/sorting/search hook)
  components/
    board/
      constants.ts                  (new — TAG_COLORS, PRIORITY_COLORS, PRIORITY_LABELS, SECTION_COLORS, PRIORITY_ORDER)
      helpers.ts                    (new — renderTextWithLinks, getHeaderColor, isWithinRange)
      ItemCard.tsx                  (new — extracted from KanbanCard, variant="card"|"row")
      SectionHeader.tsx             (new — extracted from KanbanColumn header + menu)
      AddItemInput.tsx              (new — extracted from KanbanColumn footer)
    KanbanBoard.tsx                 (refactored — thin shell importing from board/)
    ListView.tsx                    (new — accordion-style vertical view)
    BoardSkeleton.tsx               (new — shimmer skeletons for both layouts)
    ItemRow.tsx                     (deleted — legacy)
  app/
    dashboard/projects/[id]/
      page.tsx                      (modified — layout selector, cookie, skeleton)
    (public)/p/[orgSlug]/[projectSlug]/
      page.tsx                      (modified — layout selector, skeleton)
```

---

### Task 1: Extract shared constants

**Files:**
- Create: `src/components/board/constants.ts`
- Reference: `src/components/KanbanBoard.tsx:32-64` (current constant definitions)

- [ ] **Step 1: Create `src/components/board/constants.ts`**

```ts
import type { TagKey, PriorityKey } from '@/types/tracker'

export const TAG_COLORS: Record<TagKey, string> = {
  bug: '#e05555',
  question: '#d4a020',
  later: '#4a8ae0',
}

export const PRIORITY_COLORS: Record<PriorityKey, string> = {
  urgent: '#e05555',
  high: '#e08a30',
  medium: '#d4a020',
  low: '#8888a0',
}

export const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0, high: 1, medium: 2, low: 3,
}

export const PRIORITY_LABELS: Record<PriorityKey, string> = {
  urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low',
}

export const SECTION_COLORS = [
  { label: 'Default',   value: '',        lightBg: '#e8e4dd', darkBg: '#333' },
  { label: 'Sage',      value: '#e8f0de', lightBg: '#e8f0de', darkBg: '#3a4a2e' },
  { label: 'Sky',       value: '#deeaf5', lightBg: '#deeaf5', darkBg: '#2a3a4a' },
  { label: 'Blush',     value: '#f5e4e4', lightBg: '#f5e4e4', darkBg: '#4a2a2a' },
  { label: 'Lavender',  value: '#ece8f5', lightBg: '#ece8f5', darkBg: '#3a2a4a' },
  { label: 'Peach',     value: '#f5ede0', lightBg: '#f5ede0', darkBg: '#4a3a2a' },
  { label: 'Mint',      value: '#dff5ef', lightBg: '#dff5ef', darkBg: '#2a4a3a' },
  { label: 'Lemon',     value: '#f5f2d0', lightBg: '#f5f2d0', darkBg: '#4a4a2a' },
  { label: 'Slate',     value: '#e2e8f0', lightBg: '#e2e8f0', darkBg: '#2a2e38' },
  { label: 'Rose',      value: '#fce7f3', lightBg: '#fce7f3', darkBg: '#4a2a3a' },
] as const
```

- [ ] **Step 2: Verify the directory exists**

Run: `ls src/components/board/ 2>/dev/null || mkdir -p src/components/board`

- [ ] **Step 3: Commit**

```bash
git add src/components/board/constants.ts
git commit -m "feat: extract shared board constants"
```

---

### Task 2: Extract shared helpers

**Files:**
- Create: `src/components/board/helpers.ts`
- Reference: `src/components/KanbanBoard.tsx:21-30` (getHeaderColor), `87-96` (renderTextWithLinks), `98-107` (isWithinRange)

- [ ] **Step 1: Create `src/components/board/helpers.ts`**

```ts
import type React from 'react'

export function getHeaderColor(hex: string | undefined, isDark: boolean): string {
  if (!hex) return 'var(--kanban-header)'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  if (isDark) {
    return `rgb(${Math.round(r * 0.35)}, ${Math.round(g * 0.35)}, ${Math.round(b * 0.35)})`
  }
  return `rgb(${Math.round(r * 0.85 + 38)}, ${Math.round(g * 0.85 + 38)}, ${Math.round(b * 0.85 + 38)})`
}

/**
 * Renders text with clickable links.
 * Note: regex is created fresh per call to avoid stateful /g lastIndex bug.
 */
export function renderTextWithLinks(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s<>"')\]]+)/g
  const parts = text.split(urlRegex)
  if (parts.length === 1) return text
  return parts.map((part, i) => {
    // Use a separate non-/g regex for testing (the /g on split is fine since it's fresh per call)
    if (/(https?:\/\/[^\s<>"')\]]+)/.test(part)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{part}</a>
    }
    return part
  })
}

export function isWithinRange(ts: number | undefined, range: 'today' | 'week' | 'month'): boolean {
  if (!ts) return false
  const now = Date.now()
  const diff = now - ts
  switch (range) {
    case 'today': return diff < 86_400_000
    case 'week': return diff < 604_800_000
    case 'month': return diff < 2_592_000_000
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/board/helpers.ts
git commit -m "feat: extract shared board helpers (fix renderTextWithLinks regex bug)"
```

---

### Task 3: Extract `useBoardLogic` hook

**Files:**
- Create: `src/hooks/use-board-logic.ts`
- Reference: `src/components/KanbanBoard.tsx:68-139` (BoardFilters, ColumnSort, applyFilters, applySorting), `308-335` (search + default sort logic)

- [ ] **Step 1: Create `src/hooks/use-board-logic.ts`**

```ts
import { useState, useRef, useCallback, useMemo } from 'react'
import type { Section, Item, PriorityKey } from '@/types/tracker'
import { PRIORITY_ORDER } from '@/components/board/constants'
import { isWithinRange } from '@/components/board/helpers'

export interface BoardFilters {
  priority: PriorityKey[]
  checked: 'all' | 'checked' | 'unchecked'
  tags: import('@/types/tracker').TagKey[]
  dateRange: 'all' | 'today' | 'week' | 'month'
}

export const DEFAULT_FILTERS: BoardFilters = {
  priority: [],
  checked: 'all',
  tags: [],
  dateRange: 'all',
}

export interface ColumnSort {
  field: 'default' | 'priority' | 'date' | 'checked' | 'alpha'
  direction: 'asc' | 'desc'
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
    result = result.filter((i) => isWithinRange(i.createdAt, filters.dateRange as 'today' | 'week' | 'month'))
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

interface UseBoardLogicParams {
  sections: Section[]
  search: string
  filters: BoardFilters
}

export function useBoardLogic({ sections, search, filters }: UseBoardLogicParams) {
  const [sortStates, setSortStates] = useState<Record<string, ColumnSort>>({})
  // Preserve stable ordering per section when default sort is active (unchecked-first)
  const lastSortedOrders = useRef<Record<string, string[]>>({})

  const setSortState = useCallback((sectionId: string, sort: ColumnSort) => {
    setSortStates((prev) => ({ ...prev, [sectionId]: sort }))
  }, [])

  const matchesSearch = useCallback(
    (item: Item) => !search || item.text.toLowerCase().includes(search.toLowerCase()),
    [search]
  )

  const processItems = useCallback(
    (section: Section): Item[] => {
      const sort = sortStates[section.id] ?? { field: 'default', direction: 'asc' }

      // Filter by search
      let items = section.items.filter((i) => matchesSearch(i))

      // Apply board-level filters
      items = applyFilters(items, filters)

      // Apply explicit sort
      if (sort.field !== 'default') {
        return applySorting(items, sort)
      }

      // Default sort: unchecked first with stable ordering
      const hasUnchecked = items.some((i) => !i.checked)
      if (hasUnchecked) {
        const sorted = items.slice().sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? 1 : -1))
        lastSortedOrders.current[section.id] = sorted.map((i) => i.id)
        return sorted
      }
      const lastOrder = lastSortedOrders.current[section.id]
      if (lastOrder && lastOrder.length > 0) {
        const pos = new Map(lastOrder.map((id, idx) => [id, idx]))
        return items.slice().sort((a, b) => (pos.get(a.id) ?? 999) - (pos.get(b.id) ?? 999))
      }
      return items
    },
    [sortStates, matchesSearch, filters]
  )

  return { sortStates, setSortState, processItems, matchesSearch }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/hooks/use-board-logic.ts 2>&1 | head -20` (or just run the full type check)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-board-logic.ts
git commit -m "feat: extract useBoardLogic hook with filtering, sorting, search"
```

---

### Task 4: Extract `ItemCard` component

**Files:**
- Create: `src/components/board/ItemCard.tsx`
- Reference: `src/components/KanbanBoard.tsx:687-953` (KanbanCard)

This is the largest extraction. ItemCard supports two variants:
- `"card"` — current kanban card style (used in KanbanBoard columns)
- `"row"` — compact horizontal row (used in ListView)

- [ ] **Step 1: Create `src/components/board/ItemCard.tsx`**

Extract the full KanbanCard component from `KanbanBoard.tsx:699-953`. Changes from original:

1. Import constants from `./constants` instead of inline
2. Import `renderTextWithLinks` from `./helpers`
3. Add `variant` prop (`"card" | "row"`, default `"card"`)
4. For `variant="row"`: use a single-line horizontal layout instead of stacked card. Key CSS differences:
   - Container: `flex items-center gap-2 px-3 py-2 border-b border-border/30 hover:bg-muted/30` instead of the card styling
   - Tags and priority render inline (same row) instead of stacked below
   - Footer actions always visible (no hover reveal) and more compact
   - Notes panel still expands below

```tsx
'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, MessageSquare, Trash2, ArrowUp } from 'lucide-react'
import type { Item, PriorityKey, Note } from '@/types/tracker'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TAG_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from './constants'
import { renderTextWithLinks } from './helpers'

interface ItemCardProps {
  item: Item
  variant?: 'card' | 'row'
  onToggle: () => void
  onUpdateText: (text: string) => void
  onUpdatePriority: (priority: PriorityKey | null) => void
  onDelete: () => void
  onAddNote: (text: string) => void
  onDeleteNote: (noteId: string) => void
  onOpenTagPicker: (anchorEl: HTMLButtonElement, item: Item) => void
  readOnly?: boolean
}

export function ItemCard({
  item, variant = 'card',
  onToggle, onUpdateText, onUpdatePriority, onDelete, onAddNote, onDeleteNote, onOpenTagPicker, readOnly,
}: ItemCardProps) {
  const tagBtnRef = useRef<HTMLButtonElement>(null)
  const [showNotes, setShowNotes] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(item.text)

  const commitEdit = () => {
    const v = editText.trim()
    if (v && v !== item.text) onUpdateText(v)
    if (!v) setEditText(item.text)
    setEditing(false)
  }

  const commitNote = () => {
    const v = noteText.trim()
    if (v) { onAddNote(v); setNoteText('') }
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
      return
    }
    onDelete()
  }

  const tagCount = item.tags.length
  const noteCount = item.notes.length

  const formatTs = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const isRow = variant === 'row'

  // ── Notes panel (shared between variants) ──
  const notesPanel = (
    <AnimatePresence initial={false}>
      {showNotes && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.18 }}
          className="overflow-hidden"
        >
          <div className={isRow ? 'pl-9 pt-2 pb-2 border-b border-border/30' : 'pl-7 pt-2 border-t border-kanban-border/50'}>
            {noteCount > 0 && (
              <div className="mb-2.5 space-y-0">
                {item.notes.map((note: Note, idx) => (
                  <div key={note.id}>
                    {idx > 0 && <div className="ml-2.5 w-px h-2 bg-border/40" />}
                    <div className="flex items-start gap-2 group/note">
                      <Avatar className="w-5 h-5 shrink-0 mt-0.5">
                        <AvatarFallback className="text-[8px] bg-muted text-muted-foreground font-mono">U</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 pb-0.5">
                        <p className="text-[11px] text-foreground/80 leading-relaxed m-0 wrap-break-word select-text cursor-text">{renderTextWithLinks(note.text)}</p>
                        <span className="text-[9px] text-muted-foreground/60 mt-0.5 block tracking-wide font-mono">{formatTs(note.ts)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteNote(note.id)}
                        title="Delete comment"
                        className="w-4 h-4 p-0 text-muted-foreground/30 hover:text-red-400 shrink-0 opacity-0 group-hover/note:opacity-100 transition-opacity"
                      >
                        &times;
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1.5 pb-1">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitNote(); if (e.key === 'Escape') setShowNotes(false) }}
                placeholder="Write a comment…"
                autoFocus
                className="flex-1 text-[11px] border border-kanban-border rounded-lg px-2.5 py-1.5 outline-none font-[inherit] text-foreground bg-kanban-input-bg placeholder:text-muted-foreground/40 focus:border-border focus:ring-1 focus:ring-ring/30 transition-colors"
              />
              {noteText.trim() && (
                <Button onClick={commitNote} size="sm" className="h-7 px-2.5 text-[10px] shrink-0">Save</Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // ── Action buttons (shared between variants) ──
  const actionButtons = !readOnly && (
    <div className={`flex items-center gap-0.5 ${
      isRow
        ? ''
        : `pl-6 ${(tagCount > 0 || noteCount > 0 || item.priority) ? '' : 'opacity-0 group-hover/card:opacity-100 transition-opacity'}`
    }`}>
      <Button
        ref={tagBtnRef}
        variant="ghost"
        size="sm"
        onClick={() => onOpenTagPicker(tagBtnRef.current!, item)}
        title="Tags"
        className={`h-5 px-1.5 text-[10px] gap-1 ${tagCount > 0 ? 'text-emerald-500' : 'text-muted-foreground/50 hover:text-muted-foreground'}`}
      >
        <Tag size={12} />
        {tagCount > 0 && <span className="font-medium">{tagCount}</span>}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={`inline-flex items-center gap-1 h-5 px-1.5 text-[10px] rounded-sm hover:bg-accent ${item.priority ? '' : 'text-muted-foreground/50 hover:text-muted-foreground'}`}
          style={item.priority ? { color: PRIORITY_COLORS[item.priority] } : undefined}
        >
          <ArrowUp size={12} />
          {item.priority && <span className="font-medium">{PRIORITY_LABELS[item.priority]}</span>}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-36">
          {(['urgent', 'high', 'medium', 'low'] as const).map((p) => (
            <DropdownMenuItem key={p} onClick={() => onUpdatePriority(item.priority === p ? null : p)} className="gap-2 text-[12px]">
              <span style={{ background: PRIORITY_COLORS[p] }} className="w-2 h-2 rounded-full shrink-0" />
              {PRIORITY_LABELS[p]}
              {item.priority === p && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            </DropdownMenuItem>
          ))}
          {item.priority && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onUpdatePriority(null)} className="gap-2 text-[12px] text-muted-foreground">
                Clear priority
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowNotes((v) => !v)}
        title="Comments"
        className={`h-5 px-1.5 text-[10px] gap-1 ${noteCount > 0 ? 'text-blue-400' : 'text-muted-foreground/50 hover:text-muted-foreground'}`}
      >
        <MessageSquare size={12} />
        {noteCount > 0 && <span className="font-medium">{noteCount}</span>}
      </Button>
    </div>
  )

  // ── Delete button ──
  const deleteBtn = !readOnly && (confirmDelete ? (
    <Button variant="destructive" size="sm" onClick={handleDelete} title="Confirm delete" className="h-5 px-1.5 text-[10px] gap-1 shrink-0">
      <Trash2 size={10} /> Delete?
    </Button>
  ) : (
    <Button variant="ghost" size="sm" onClick={handleDelete} title="Delete item"
      className={`w-5 h-5 p-0 text-muted-foreground/40 hover:text-red-400 shrink-0 ${
        isRow ? 'opacity-0 group-hover/row:opacity-100' : 'opacity-0 group-hover/card:opacity-100'
      } transition-opacity`}
    >
      <Trash2 size={12} />
    </Button>
  ))

  // ── Tag pills (discrete: colored dot + muted text) ──
  const tagPills = tagCount > 0 && (
    <div className={`flex flex-wrap gap-1 ${isRow ? '' : 'pl-7'}`}>
      {item.tags.map((tag) => (
        <span key={tag}
          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-border text-muted-foreground">
          <span style={{ background: TAG_COLORS[tag] }} className="w-1.5 h-1.5 rounded-full" />
          {tag}
        </span>
      ))}
    </div>
  )

  // ── Priority pill (discrete for low/medium/high, distinctive for urgent) ──
  const isUrgent = item.priority === 'urgent'
  const priorityPill = item.priority && (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
        isUrgent
          ? 'bg-red-500/10 text-red-500 border-red-500/25'
          : 'border-border text-muted-foreground'
      }`}
    >
      <span style={{ background: PRIORITY_COLORS[item.priority] }} className="w-1.5 h-1.5 rounded-full" />
      {PRIORITY_LABELS[item.priority]}
    </span>
  )

  // ── Text content ──
  const textContent = editing && !readOnly ? (
    <textarea
      value={editText}
      onChange={(e) => setEditText(e.target.value)}
      onBlur={commitEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
        if (e.key === 'Escape') { setEditText(item.text); setEditing(false) }
      }}
      autoFocus
      className="flex-1 text-[13px] leading-relaxed border border-border rounded-md bg-kanban-input-bg px-1.5 py-0.5 outline-none text-foreground font-[inherit] resize-none focus:ring-1 focus:ring-ring/30 transition-colors"
      style={{ fieldSizing: 'content' } as React.CSSProperties}
    />
  ) : (
    <span
      onDoubleClick={() => { if (!readOnly) { setEditText(item.text); setEditing(true) } }}
      className={`flex-1 text-[13px] leading-relaxed wrap-break-word transition-colors ${
        readOnly ? '' : 'cursor-text'
      } ${item.checked ? 'text-muted-foreground/60 line-through' : 'text-foreground'}`}
    >
      {item.text}
    </span>
  )

  // ═══════ ROW VARIANT ═══════
  if (isRow) {
    return (
      <div className="group/row">
        <div className={`flex items-center gap-2.5 px-3 py-2 transition-colors ${
          isUrgent ? 'border-l-2 border-l-red-500/40 bg-red-500/3' : 'hover:bg-muted/30'
        }`}>
          <Checkbox
            checked={item.checked}
            onCheckedChange={onToggle}
            disabled={readOnly}
            className={`shrink-0${readOnly ? ' pointer-events-none' : ''}`}
          />
          {textContent}
          {tagPills}
          {priorityPill}
          {actionButtons}
          {deleteBtn}
        </div>
        {notesPanel}
      </div>
    )
  }

  // ═══════ CARD VARIANT ═══════
  return (
    <div className={`group/card rounded-xl px-3 py-2.5 flex flex-col gap-2 shadow-sm transition-colors ${
      isUrgent
        ? 'bg-red-500/3 border border-red-500/20 hover:bg-red-500/6'
        : 'bg-kanban-card border border-kanban-border hover:bg-kanban-card-hover hover:border-border'
    }`}>
      {/* Main row */}
      <div className="flex items-start gap-2.5">
        <Checkbox
          checked={item.checked}
          onCheckedChange={onToggle}
          disabled={readOnly}
          className={`mt-[3px] shrink-0${readOnly ? ' pointer-events-none' : ''}`}
        />
        {textContent}
        {deleteBtn}
      </div>
      {tagPills}
      {item.priority && <div className="pl-7">{priorityPill}</div>}
      {actionButtons}
      {notesPanel}
    </div>
  )
}
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/board/ItemCard.tsx
git commit -m "feat: extract ItemCard component with card/row variants"
```

---

### Task 5: Extract `SectionHeader` component

**Files:**
- Create: `src/components/board/SectionHeader.tsx`
- Reference: `src/components/KanbanBoard.tsx:382-581` (header + dropdown menu)

The SectionHeader includes: editable title, icon, color indicator, progress counter, sort menu, color picker, icon picker, delete option. It accepts an optional `onToggleExpand` prop for use in ListView (accordion chevron).

- [ ] **Step 1: Create `src/components/board/SectionHeader.tsx`**

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Trash2, Plus, Sparkles, Palette, MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react'
import type { Section, PriorityKey, TagKey } from '@/types/tracker'
import type { ColumnSort } from '@/hooks/use-board-logic'
import { SECTION_ICONS, ICON_GROUPS, type SectionIconKey } from '@/components/SectionIcons'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { AddItemModal } from '@/components/AddItemModal'
import { SECTION_COLORS } from './constants'
import { getHeaderColor } from './helpers'

interface SectionHeaderProps {
  section: Section
  done: number
  total: number
  sort: ColumnSort
  isNew: boolean
  isDark: boolean
  readOnly?: boolean
  // Accordion expand/collapse (ListView only)
  expanded?: boolean
  onToggleExpand?: () => void
  // Callbacks
  onSetSort: (sort: ColumnSort) => void
  onUpdateTitle: (title: string) => void
  onColorChange: (color: string) => void
  onIconChange: (icon: string) => void
  onDeleteSection: () => void
  onAddItem?: (text: string, priority?: PriorityKey, tags?: TagKey[]) => void
}

export function SectionHeader({
  section, done, total, sort, isNew, isDark, readOnly,
  expanded, onToggleExpand,
  onSetSort, onUpdateTitle, onColorChange, onIconChange, onDeleteSection, onAddItem,
}: SectionHeaderProps) {
  const [iconGroup, setIconGroup] = useState(0)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const allDone = total > 0 && done === total
  const SectionIcon = section.icon ? SECTION_ICONS[section.icon as SectionIconKey] : null
  const headerColor = getHeaderColor(section.color, isDark)

  useEffect(() => {
    if (isNew && titleRef.current) {
      titleRef.current.focus()
      titleRef.current.select()
    }
  }, [isNew])

  return (
    <motion.div
      animate={isNew
        ? { backgroundColor: ['#2d4a1e', '#264016', headerColor] }
        : { backgroundColor: headerColor }
      }
      transition={{ duration: 1.2, ease: 'easeOut' }}
      className={`flex items-center gap-1.5 px-3 py-2.5 rounded-t-[12px] border-b border-border/30 select-none shrink-0 ${
        onToggleExpand ? 'cursor-pointer' : 'cursor-grab'
      }`}
      onClick={onToggleExpand}
    >
      {/* Accordion chevron (list view only) */}
      {onToggleExpand != null && (
        <motion.span
          animate={{ rotate: expanded ? 0 : -90 }}
          transition={{ duration: 0.15 }}
          className="shrink-0 text-muted-foreground"
        >
          <ChevronDown size={14} />
        </motion.span>
      )}

      {SectionIcon && (
        <span className="flex items-center text-emerald-600 dark:text-emerald-400/70 shrink-0">
          <SectionIcon size={14} />
        </span>
      )}
      {readOnly ? (
        <span className="flex-1 text-[13px] font-bold text-foreground min-w-0 px-0.5 py-px">{section.title}</span>
      ) : (
        <input
          ref={titleRef}
          type="text"
          defaultValue={section.title}
          onBlur={(e) => onUpdateTitle(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex-1 text-[13px] font-bold border-none bg-transparent outline-none text-foreground font-[inherit] cursor-text min-w-0 px-0.5 py-px"
        />
      )}
      {allDone && (
        <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-semibold shrink-0">
          <CheckCircle2 size={12} /> Done
        </span>
      )}
      <span className={`text-[11px] rounded-full px-[7px] py-px shrink-0 whitespace-nowrap ${
        allDone ? 'bg-emerald-500/15 text-emerald-500' : 'bg-foreground/10 text-foreground'
      }`}>
        {done}/{total}
      </span>
      {sort.field !== 'default' && (
        <span className="flex items-center text-muted-foreground/60 shrink-0" title={`Sorted by ${sort.field}`}>
          {sort.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
        </span>
      )}

      {/* + Add item button (opens modal for full priority/tag selection) */}
      {!readOnly && onAddItem && (
        <button
          onClick={(e) => { e.stopPropagation(); setAddModalOpen(true) }}
          onMouseDown={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center w-6 h-5 rounded text-muted-foreground hover:text-foreground shrink-0 outline-none"
          title="Add item"
        >
          <Plus size={14} />
        </button>
      )}

      {/* ··· Menu */}
      {!readOnly && (
        <DropdownMenu>
          <DropdownMenuTrigger
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center w-6 h-5 rounded text-muted-foreground hover:text-foreground shrink-0 text-[15px] tracking-wider outline-none"
          >
            <MoreHorizontal size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* Sort submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                <ArrowUpDown size={14} /> Sort by
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
                        onSetSort({ field: opt.field, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
                      } else {
                        onSetSort({ field: opt.field, direction: 'asc' })
                      }
                    }}
                    className="gap-2 justify-between"
                  >
                    <span>{opt.label}</span>
                    {sort.field === opt.field && opt.field !== 'default' && (
                      <span className="text-[10px] text-muted-foreground">{sort.direction === 'asc' ? '\u2191' : '\u2193'}</span>
                    )}
                    {sort.field === opt.field && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Color submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                <Palette size={14} /> Color
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Section color</p>
                <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                  {SECTION_COLORS.map((c) => {
                    const active = (section.color ?? '') === c.value
                    const bg = isDark ? c.darkBg : c.lightBg
                    return (
                      <button key={c.value || 'default'} title={c.label} onClick={() => onColorChange(c.value)}
                        className="w-7 h-7 rounded-lg transition-transform hover:scale-110"
                        style={{ background: bg, border: active ? '2px solid var(--foreground)' : '1px solid var(--border)', boxShadow: active ? '0 0 0 2px var(--ring)' : 'none' }}
                      />
                    )
                  })}
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Icon submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                {SectionIcon ? <SectionIcon size={14} /> : <Sparkles size={14} />} Icon
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-[248px] p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Section icon</p>
                <div className="flex gap-1 mb-2.5">
                  {ICON_GROUPS.map((g, i) => (
                    <Button key={g.label} variant={iconGroup === i ? "default" : "outline"} size="sm"
                      onClick={() => setIconGroup(i)} className="flex-1 h-6 text-[11px] px-1">{g.label}</Button>
                  ))}
                  <Button variant={!section.icon ? "default" : "outline"} size="sm"
                    onClick={() => onIconChange('')} className="h-6 text-[11px] px-2">None</Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {ICON_GROUPS[iconGroup].keys.map((key) => {
                    const IconComp = SECTION_ICONS[key as SectionIconKey]
                    const active = section.icon === key
                    return (
                      <Button key={key} variant="ghost" title={key} onClick={() => onIconChange(key)}
                        className={`w-8 h-8 p-0 ${active ? 'bg-accent text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'}`}>
                        <IconComp size={15} />
                      </Button>
                    )
                  })}
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDeleteSection} className="gap-2 text-red-400 focus:text-red-300">
              <Trash2 size={14} /> Delete section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Add item modal (triggered by + button in header) */}
      {addModalOpen && onAddItem && (
        <AddItemModal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onSubmit={({ text, priority, tags }) => {
            onAddItem(text, priority, tags)
            setAddModalOpen(false)
          }}
        />
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/board/SectionHeader.tsx
git commit -m "feat: extract SectionHeader component with accordion support"
```

---

### Task 6: Extract `AddItemInput` component

**Files:**
- Create: `src/components/board/AddItemInput.tsx`
- Reference: `src/components/KanbanBoard.tsx:650-680` (add item input + AddItemModal usage)

- [ ] **Step 1: Create `src/components/board/AddItemInput.tsx`**

```tsx
'use client'

import { useState, useRef } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PriorityKey, TagKey } from '@/types/tracker'

interface AddItemInputProps {
  onAddItem: (text: string, priority?: PriorityKey, tags?: TagKey[]) => void
}

export function AddItemInput({ onAddItem }: AddItemInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const commit = () => {
    const v = value.trim()
    if (v) { onAddItem(v); setValue('') }
  }

  return (
    <>
      <div className="border-t border-border/20 px-3 py-2 rounded-b-[12px] shrink-0">
        <div className="flex items-center gap-1.5">
          <Plus size={12} className="text-muted-foreground/40 shrink-0" />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setValue('') }}
            placeholder="Add item…"
            className="flex-1 border-none bg-transparent text-xs text-foreground outline-none font-[inherit] py-0.5 placeholder:text-muted-foreground/40"
          />
          {value.trim() && (
            <Button onClick={commit} size="sm" className="h-6 px-2.5 text-[11px] shrink-0">Add</Button>
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/board/AddItemInput.tsx
git commit -m "feat: extract AddItemInput component"
```

---

### Task 7: Refactor KanbanBoard to use shared components

**Files:**
- Modify: `src/components/KanbanBoard.tsx` (full rewrite — from ~954 lines to ~200)

This is the critical step. Replace the monolithic component with one that imports from `board/` and `useBoardLogic`.

- [ ] **Step 1: Rewrite `src/components/KanbanBoard.tsx`**

The new KanbanBoard.tsx should:
1. **Delete** the old `BoardFilters` interface (lines 68-73), `ColumnSort` interface (lines 75-78), `DEFAULT_FILTERS` constant (lines 80-85), all helper functions (`getHeaderColor`, `renderTextWithLinks`, `isWithinRange`, `applyFilters`, `applySorting`), all constant definitions (`TAG_COLORS`, `PRIORITY_COLORS`, `PRIORITY_ORDER`, `PRIORITY_LABELS`, `SECTION_COLORS`), the entire `KanbanCard` component, and the column-internal sort/filter logic
2. Re-export `BoardFilters`, `DEFAULT_FILTERS`, `ColumnSort` from `use-board-logic` (for backward compat with page.tsx imports)
3. Import `useBoardLogic` hook
4. Import `ItemCard`, `SectionHeader`, `AddItemInput` from `board/`
5. Keep the horizontal scroll container + drag-to-reorder logic (lines 165-250)
6. Slim down `KanbanColumn` to just render shared components + overflow/scroll logic

Key structure:
```tsx
// Re-exports for backward compat
export { type BoardFilters, DEFAULT_FILTERS, type ColumnSort } from '@/hooks/use-board-logic'
export type { ... }

// KanbanBoard: horizontal scroll + columns + drag reorder
export function KanbanBoard({ ... }: KanbanBoardProps) {
  const { sortStates, setSortState, processItems } = useBoardLogic({ sections, search, filters: filters ?? DEFAULT_FILTERS })
  // ... drag state, handleDrop ...
  // Render columns using SectionHeader + ItemCard variant="card" + AddItemInput
}
```

The full KanbanColumn becomes internal to this file but much shorter — it receives `processItems` output rather than computing it. The sort state comes from the hook.

- [ ] **Step 2: Verify the dev server compiles**

Run: `npx next build --no-lint 2>&1 | tail -20` or `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 3: Manually test kanban board in browser**

Verify: sections render, items display, drag reorder works, sort/filter/search work, notes expand, priority/tag pickers work, add item works, delete works.

- [ ] **Step 4: Commit**

```bash
git add src/components/KanbanBoard.tsx
git commit -m "refactor: slim KanbanBoard to use shared board components and useBoardLogic hook"
```

---

### Task 8: Create `BoardSkeleton` shimmer component

**Files:**
- Create: `src/components/BoardSkeleton.tsx`

- [ ] **Step 1: Create `src/components/BoardSkeleton.tsx`**

```tsx
export function KanbanSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden pb-6 pt-1 h-full animate-pulse">
      {[0, 1, 2, 3].map((col) => (
        <div key={col} className="w-[300px] shrink-0 h-full flex flex-col bg-muted/30 rounded-[14px] border-2 border-border/30">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-3 rounded-t-[12px] border-b border-border/20">
            <div className="h-3.5 w-24 bg-muted rounded" />
            <div className="ml-auto h-4 w-8 bg-muted rounded-full" />
          </div>
          {/* Cards */}
          <div className="flex-1 p-2 space-y-1.5">
            {[56, 72, 48, 64, 40].slice(0, col === 0 ? 4 : col === 1 ? 5 : col === 2 ? 3 : 4).map((h, i) => (
              <div key={i} className="rounded-xl bg-muted/40 border border-border/20" style={{ height: h }} />
            ))}
          </div>
          {/* Footer */}
          <div className="px-3 py-2.5 border-t border-border/20">
            <div className="h-3 w-20 bg-muted/40 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse pt-1">
      {[0, 1, 2].map((sec) => (
        <div key={sec} className="rounded-[14px] border-2 border-border/30 overflow-hidden">
          {/* Section header */}
          <div className="flex items-center gap-2 px-3 py-3 bg-muted/30 border-b border-border/20">
            <div className="h-3 w-3 bg-muted rounded" />
            <div className="h-3.5 w-32 bg-muted rounded" />
            <div className="ml-auto h-4 w-10 bg-muted rounded-full" />
          </div>
          {/* Rows */}
          <div className="divide-y divide-border/10">
            {[0, 1, 2, 3, 4].slice(0, sec === 0 ? 4 : sec === 1 ? 5 : 3).map((row) => (
              <div key={row} className="flex items-center gap-2.5 px-3 py-2.5">
                <div className="w-4 h-4 bg-muted rounded shrink-0" />
                <div className="h-3 bg-muted/40 rounded" style={{ width: `${[75, 60, 85, 50, 70][row]}%` }} />
              </div>
            ))}
          </div>
          {/* Footer */}
          <div className="px-3 py-2.5 border-t border-border/20">
            <div className="h-3 w-20 bg-muted/40 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BoardSkeleton.tsx
git commit -m "feat: add shimmer skeleton loaders for kanban and list views"
```

---

### Task 9: Create `ListView` component

**Files:**
- Create: `src/components/ListView.tsx`
- Reference: spec section 5

- [ ] **Step 1: Create `src/components/ListView.tsx`**

```tsx
'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, Plus } from 'lucide-react'
import type { Section, Item, TagKey, PriorityKey } from '@/types/tracker'
import { useBoardLogic, DEFAULT_FILTERS, type BoardFilters } from '@/hooks/use-board-logic'
import { ItemCard } from '@/components/board/ItemCard'
import { SectionHeader } from '@/components/board/SectionHeader'
import { AddItemInput } from '@/components/board/AddItemInput'
import { Button } from '@/components/ui/button'

interface ListViewProps {
  sections: Section[]
  search: string
  newestSectionId: string | null
  readOnly?: boolean
  filters?: BoardFilters
  onToggleItem: (sectionId: string, itemId: string) => void
  onAddItem: (sectionId: string, text: string, priority?: PriorityKey, tags?: TagKey[]) => void
  onUpdateItemText: (sectionId: string, itemId: string, text: string) => void
  onUpdateItemPriority: (sectionId: string, itemId: string, priority: PriorityKey | null) => void
  onDeleteItem: (sectionId: string, itemId: string) => void
  onAddNote: (sectionId: string, itemId: string, text: string) => void
  onDeleteNote: (sectionId: string, itemId: string, noteId: string) => void
  onDeleteSection: (sectionId: string) => void
  onUpdateSectionTitle: (sectionId: string, title: string) => void
  onColorChange: (sectionId: string, color: string) => void
  onIconChange: (sectionId: string, icon: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onOpenTagPicker: (anchorEl: HTMLButtonElement, item: Item, sectionId: string) => void
  onAddSection?: () => void
}

export function ListView({
  sections, search, newestSectionId, readOnly, filters,
  onToggleItem, onAddItem, onUpdateItemText, onUpdateItemPriority, onDeleteItem,
  onAddNote, onDeleteNote, onDeleteSection, onUpdateSectionTitle, onColorChange,
  onIconChange, onReorder, onOpenTagPicker, onAddSection,
}: ListViewProps) {
  const { sortStates, setSortState, processItems } = useBoardLogic({
    sections, search, filters: filters ?? DEFAULT_FILTERS,
  })

  // All sections expanded by default
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggleExpand = useCallback((id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  // Drag reorder state (vertical)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const handleDrop = (toIndex: number) => {
    if (dragIndex !== null && dragIndex !== toIndex) onReorder(dragIndex, toIndex)
    setDragIndex(null)
    setDropIndex(null)
  }

  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')

  return (
    <div className="space-y-3 overflow-y-auto h-full pb-6 pt-1">
      <AnimatePresence initial={false}>
        {sections.map((section, i) => {
          const filtered = processItems(section)
          const done = section.items.filter((it) => it.checked).length
          const total = section.items.length
          const expanded = !collapsed[section.id]
          const sort = sortStates[section.id] ?? { field: 'default' as const, direction: 'asc' as const }

          return (
            <motion.div
              key={section.id}
              layout
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            >
              {/* Plain div for HTML drag — motion.div's onDragStart is framer-motion's drag, not HTML drag */}
              <div
                draggable={!readOnly}
                onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragIndex(i) }}
                onDragOver={(e) => { e.preventDefault(); setDropIndex(i) }}
                onDragEnd={() => { setDragIndex(null); setDropIndex(null) }}
                onDrop={(e) => { e.preventDefault(); handleDrop(i) }}
                className={`rounded-[14px] border-2 overflow-hidden transition-[box-shadow,opacity,border-color] duration-150 ${
                  dragIndex === i ? 'opacity-60 shadow-xl border-dashed border-border' :
                  dropIndex === i && dragIndex !== i ? 'border-dashed border-emerald-600' :
                  'border-kanban-border'
                }`}
              >
              <SectionHeader
                section={section}
                done={done}
                total={total}
                sort={sort}
                isNew={section.id === newestSectionId}
                isDark={isDark}
                readOnly={readOnly}
                expanded={expanded}
                onToggleExpand={() => toggleExpand(section.id)}
                onSetSort={(s) => setSortState(section.id, s)}
                onUpdateTitle={(title) => onUpdateSectionTitle(section.id, title)}
                onColorChange={(color) => onColorChange(section.id, color)}
                onIconChange={(icon) => onIconChange(section.id, icon)}
                onDeleteSection={() => onDeleteSection(section.id)}
                onAddItem={(text, priority, tags) => onAddItem(section.id, text, priority, tags)}
              />

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    {filtered.length > 0 ? (
                      <div className="divide-y divide-border/10">
                        {filtered.map((item) => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            variant="row"
                            onToggle={() => onToggleItem(section.id, item.id)}
                            onUpdateText={(text) => onUpdateItemText(section.id, item.id, text)}
                            onUpdatePriority={(priority) => onUpdateItemPriority(section.id, item.id, priority)}
                            onDelete={() => onDeleteItem(section.id, item.id)}
                            onAddNote={(text) => onAddNote(section.id, item.id, text)}
                            onDeleteNote={(noteId) => onDeleteNote(section.id, item.id, noteId)}
                            onOpenTagPicker={(anchorEl, it) => onOpenTagPicker(anchorEl, it, section.id)}
                            readOnly={readOnly}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-6 px-3 text-muted-foreground">
                        <ClipboardList size={28} strokeWidth={1.4} />
                        <span className="text-xs">{search ? 'No matches' : 'No items yet'}</span>
                      </div>
                    )}

                    {!readOnly && (
                      <AddItemInput onAddItem={(text, priority, tags) => onAddItem(section.id, text, priority, tags)} />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Add section placeholder */}
      {!readOnly && (
        <div
          className="flex items-center justify-center rounded-[14px] border-2 border-dashed border-border/40 hover:border-border hover:bg-muted/30 min-h-[80px] transition-colors cursor-pointer group/add"
          onClick={onAddSection}
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground/50 group-hover/add:text-muted-foreground transition-colors">
            <Plus size={20} strokeWidth={1.5} />
            <span className="text-xs font-medium">New section</span>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/ListView.tsx
git commit -m "feat: add ListView component with accordion sections"
```

---

### Task 10: Add layout selector and skeleton to dashboard page

**Files:**
- Modify: `src/app/dashboard/projects/[id]/page.tsx`

- [ ] **Step 1: Add imports**

Add to the import block:
```tsx
import { LayoutGrid, List } from "lucide-react"  // LayoutGrid already imported, just add List
import { ListView } from "@/components/ListView"
import { KanbanSkeleton, ListSkeleton } from "@/components/BoardSkeleton"
```

Note: `LayoutGrid` is already imported — just add `List` to the existing lucide import.

- [ ] **Step 2: Add layout state with cookie persistence**

Inside `ProjectPage`, after the `const [filters, setFilters] = ...` block (~line 441), add:

```tsx
// Layout preference (cookie-persisted)
const [layout, setLayout] = useState<'kanban' | 'list'>(() => {
  if (typeof document === 'undefined') return 'kanban'
  const match = document.cookie.match(/(?:^|; )view-layout=(\w+)/)
  return (match?.[1] === 'list') ? 'list' : 'kanban'
})

const handleSetLayout = useCallback((l: 'kanban' | 'list') => {
  setLayout(l)
  document.cookie = `view-layout=${l}; path=/; max-age=31536000; SameSite=Lax`
}, [])
```

- [ ] **Step 3: Add layout selector to header**

In the header section, after the active filter pills block (`{hasActiveFilters && (...)}`) and before the search toggle (`{searchOpen ? (...) : (...)}`), insert:

```tsx
{/* Layout selector */}
<div className="flex items-center bg-muted border border-border rounded-md">
  <button
    onClick={() => handleSetLayout('kanban')}
    className={`flex items-center justify-center w-7 h-7 rounded-l-md transition-colors ${
      layout === 'kanban' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
    }`}
    title="Board view"
  >
    <LayoutGrid size={14} />
  </button>
  <button
    onClick={() => handleSetLayout('list')}
    className={`flex items-center justify-center w-7 h-7 rounded-r-md transition-colors ${
      layout === 'list' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
    }`}
    title="List view"
  >
    <List size={14} />
  </button>
</div>
```

- [ ] **Step 4: Replace board loading and rendering**

Replace the `TabsContent value="board"` block (lines 1101-1139) with:

```tsx
<TabsContent value="board" className="flex-1 overflow-hidden mt-0 -mx-4">
  {loadingBoard ? (
    <div className="h-full px-4">
      {layout === 'kanban' ? <KanbanSkeleton /> : <ListSkeleton />}
    </div>
  ) : sections.length === 0 ? (
    <div className="h-full flex items-center justify-center">
      <EmptyState
        icon={LayoutGrid}
        title="No sections yet"
        subtitle="Add your first section to start organizing test cases."
        ctaLabel="Add section"
        onCta={handleAddSection}
      />
    </div>
  ) : layout === 'kanban' ? (
    <div className="h-full px-4">
      <KanbanBoard
        sections={sections}
        search={search}
        filters={filters}
        newestSectionId={newestSectionId}
        onToggleItem={handleToggleItem}
        onAddItem={handleAddItem}
        onUpdateItemText={handleUpdateItemText}
        onUpdateItemPriority={handleUpdateItemPriority}
        onDeleteItem={handleDeleteItem}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
        onDeleteSection={handleDeleteSection}
        onUpdateSectionTitle={handleUpdateSectionTitle}
        onColorChange={handleColorChange}
        onIconChange={handleIconChange}
        onReorder={handleReorder}
        onOpenTagPicker={handleOpenTagPicker}
        onAddSection={handleAddSection}
      />
    </div>
  ) : (
    <div className="h-full px-4">
      <ListView
        sections={sections}
        search={search}
        filters={filters}
        newestSectionId={newestSectionId}
        onToggleItem={handleToggleItem}
        onAddItem={handleAddItem}
        onUpdateItemText={handleUpdateItemText}
        onUpdateItemPriority={handleUpdateItemPriority}
        onDeleteItem={handleDeleteItem}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
        onDeleteSection={handleDeleteSection}
        onUpdateSectionTitle={handleUpdateSectionTitle}
        onColorChange={handleColorChange}
        onIconChange={handleIconChange}
        onReorder={handleReorder}
        onOpenTagPicker={handleOpenTagPicker}
        onAddSection={handleAddSection}
      />
    </div>
  )}
</TabsContent>
```

- [ ] **Step 5: Update imports — replace old BoardFilters import path if needed**

If `BoardFilters` and `DEFAULT_FILTERS` are still imported from `@/components/KanbanBoard`, verify the re-export works. If not, update to import from `@/hooks/use-board-logic`.

- [ ] **Step 6: Verify dev server compiles and renders**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/projects/[id]/page.tsx
git commit -m "feat: add layout selector with cookie persistence and shimmer skeletons"
```

---

### Task 11: Update public page with layout selector and skeleton

**Files:**
- Modify: `src/app/(public)/p/[orgSlug]/[projectSlug]/page.tsx`

- [ ] **Step 1: Add imports and layout state**

Update existing React import (currently `import { use, useEffect } from "react"`) to include `useState` and `useCallback`:
```tsx
import { use, useState, useCallback, useEffect } from "react";
```

Add new imports:
```tsx
import { LayoutGrid, List } from "lucide-react"  // update existing lucide import to add List
import { ListView } from "@/components/ListView"
import { KanbanSkeleton, ListSkeleton } from "@/components/BoardSkeleton"
```

Add layout state inside `PublicProjectPage` (same cookie logic as dashboard):
```tsx
const [layout, setLayout] = useState<'kanban' | 'list'>(() => {
  if (typeof document === 'undefined') return 'kanban'
  const match = document.cookie.match(/(?:^|; )view-layout=(\w+)/)
  return (match?.[1] === 'list') ? 'list' : 'kanban'
})
const handleSetLayout = useCallback((l: 'kanban' | 'list') => {
  setLayout(l)
  document.cookie = `view-layout=${l}; path=/; max-age=31536000; SameSite=Lax`
}, [])
```

- [ ] **Step 2: Add layout selector to header and update rendering**

Add layout toggle buttons in the header. Replace the loading state and board rendering to use shimmer skeletons and conditionally render `KanbanBoard` or `ListView` based on `layout`. Both use `readOnly` and no-op callbacks.

- [ ] **Step 3: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/p/[orgSlug]/[projectSlug]/page.tsx"
git commit -m "feat: add layout selector and shimmer to public project page"
```

---

### Task 12: Delete legacy `ItemRow.tsx` and cleanup

**Files:**
- Delete: `src/components/ItemRow.tsx`
- Verify: no remaining imports of `ItemRow`

- [ ] **Step 1: Check for remaining references**

Run: `grep -r "ItemRow" src/ --include="*.tsx" --include="*.ts"` — should only match the file itself.

- [ ] **Step 2: Delete the file**

```bash
rm src/components/ItemRow.tsx
```

- [ ] **Step 3: Commit**

```bash
git add -u src/components/ItemRow.tsx
git commit -m "chore: delete legacy ItemRow component"
```

---

### Task 13: Final verification

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 2: Build check**

Run: `npx next build --no-lint 2>&1 | tail -30`
Expected: build succeeds

- [ ] **Step 3: Manual testing checklist**

In the browser:
- [ ] Kanban view renders correctly (all existing features work)
- [ ] List view renders correctly (accordion expand/collapse, items as rows)
- [ ] Layout toggle switches between views
- [ ] Layout preference persists on page reload (cookie)
- [ ] Shimmer skeleton shows during loading for both layouts
- [ ] Filter/search/sort work in both views
- [ ] Notes expand in both views
- [ ] Priority picker works in both views
- [ ] Tag picker works in both views
- [ ] Add item works in both views
- [ ] Delete item works in both views
- [ ] Section drag reorder works in both views
- [ ] Public page shows layout toggle and both views work (read-only)
- [ ] SSE real-time updates reflect in both views

- [ ] **Step 4: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: final adjustments from manual testing"
```
