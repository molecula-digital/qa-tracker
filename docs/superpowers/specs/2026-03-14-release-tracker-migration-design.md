# Release Tracker — Vite/React Migration Design

**Date:** 2026-03-14
**Status:** Approved

## Overview

Migrate `release_tracker.html` (a self-contained vanilla JS website testing matrix) into the existing Vite + React 19 + TypeScript project. Use Tailwind CSS v4 for styling, preserving the original warm beige/earthy visual design with improvements applied where appropriate.

## Technology Decisions

| Decision | Choice | Rationale |
|---|---|---|
| CSS framework | Tailwind v4 (CSS-first) | No config file, `@import "tailwindcss"`, clean integration with Vite |
| State management | `useState` + `useLocalStorage` hook | App complexity doesn't warrant reducers; simple and dependency-free |
| Structure | `src/hooks/` + `src/components/` | Standard React project layout; clear separation of concerns |
| Portals | `ReactDOM.createPortal` | Proper approach for modals and floating pickers vs fixed-position hacks |
| TypeScript | Strict types throughout | No `any`; all data shapes typed in `src/types/tracker.ts` |

## File Structure

```
src/
  types/
    tracker.ts           — TrackerData, Section, Item, Note, TagKey

  hooks/
    useLocalStorage.ts   — generic hook: read/write to localStorage with parse error safety
    useTracker.ts        — all state mutations; returns { data, actions }

  components/
    StatsBar.tsx         — total/passed/pending/sections counts + animated progress bar
    Toolbar.tsx          — search input + "Add section" + export/import buttons
    SectionCard.tsx      — collapsible section (chevron, editable title, mini bar, badge, items)
    ItemRow.tsx          — checkbox, editable label, tag badges, action buttons, notes panel
    TagPicker.tsx        — floating tag popup via createPortal; positioned relative to trigger
    ConfirmModal.tsx     — delete confirmation dialog via createPortal
    SuccessModal.tsx     — animated SVG checkmark success dialog via createPortal

  App.tsx                — root layout; calls useTracker(); composes all components
  main.tsx               — unchanged entry point
  index.css              — @import "tailwindcss"; @theme block with custom color tokens
```

## Data Types

```ts
// src/types/tracker.ts
type TagKey = 'bug' | 'question' | 'later'

interface Note {
  id: string
  text: string
  ts: number
}

interface Item {
  id: string
  text: string
  checked: boolean
  tags: TagKey[]
  notes: Note[]
}

interface Section {
  id: string
  title: string
  items: Item[]
  open: boolean
}

interface TrackerData {
  sections: Section[]
}
```

## Custom Tailwind Tokens (`@theme`)

Defined in `index.css`, used as standard Tailwind utilities (`bg-bg`, `text-muted`, etc.):

```css
@theme {
  --color-bg:      #faf8f3;   /* page/card background */
  --color-surface: #f2ede3;   /* section header, stats bar */
  --color-border:  #ddd5c2;   /* all borders */
  --color-text:    #3a3228;   /* primary text */
  --color-muted:   #8a7d6e;   /* secondary text, labels */
  --color-accent:  #7a8c5c;   /* green — progress, checkboxes, active states */
  --color-track:   #e8e0d0;   /* progress track background */
  --color-danger:  #a33;      /* delete actions */
  --font-serif:    Georgia, 'Times New Roman', serif;
}
```

## State & Hooks

### `useLocalStorage<T>(key, defaultValue)`
- Reads from localStorage on mount; catches JSON parse errors and falls back to `defaultValue`
- Returns `[value, setValue]` where `setValue` accepts either a value `T` or an updater function `(prev: T) => T` (matching `useState` API)
- When the updater form is used, the hook resolves `newValue = fn(currentValue)` and calls both React's state setter and `localStorage.setItem(key, JSON.stringify(newValue))` — ensuring persistence regardless of which form is used

### `useTracker()`
Wraps `useLocalStorage` with `release_tracker_v1` key. Returns:

```ts
{
  data: TrackerData,
  search: string,
  setSearch: (s: string) => void,
  actions: {
    addSection(): void
    deleteSection(sectionId: string): void
    updateSectionTitle(sectionId: string, title: string): void
    toggleSection(sectionId: string): void
    addItem(sectionId: string, text: string): void
    deleteItem(sectionId: string, itemId: string): void
    toggleItem(sectionId: string, itemId: string): void
    updateItemText(sectionId: string, itemId: string, text: string): void
    addTag(sectionId: string, itemId: string, tag: TagKey): void
    removeTag(sectionId: string, itemId: string, tag: TagKey): void
    addNote(sectionId: string, itemId: string, text: string): void
    deleteNote(sectionId: string, itemId: string, noteId: string): void
    exportJSON(): { sections: number; total: number }
    // App opens SuccessModal with title "Export complete" and body "Saved {sections} section(s) and {total} test item(s) to JSON."
    importJSON(file: File): Promise<void>
    // Rejects with Error on invalid JSON or missing `sections` array.
    // App catches and opens an error modal: ConfirmModal with only a "Close" button (no onConfirm) and body = error.message.              // rejects on invalid format
  }
}
```

Search state lives in `useTracker` so it's co-located with data.

## Component Props

```ts
// StatsBar — receives derived values, never raw data
interface StatsBarProps {
  total: number
  passed: number
  pending: number
  sections: number
}
// App computes these from data.sections before passing down

// Toolbar
interface ToolbarProps {
  search: string
  onSearchChange: (q: string) => void
  onAddSection: () => void
  onExport: () => void
  onImport: (file: File) => void
}

// SectionCard
interface SectionCardProps {
  section: Section
  search: string                                    // for item filtering
  onToggle: () => void
  onTitleChange: (title: string) => void
  onDelete: () => void                              // triggers ConfirmModal in App
  onAddItem: (text: string) => void
  onDeleteItem: (itemId: string) => void            // triggers ConfirmModal in App
  onToggleItem: (itemId: string) => void
  onUpdateItemText: (itemId: string, text: string) => void
  onAddTag: (itemId: string, tag: TagKey) => void
  onRemoveTag: (itemId: string, tag: TagKey) => void
  onAddNote: (itemId: string, text: string) => void
  onDeleteNote: (itemId: string, noteId: string) => void
  onOpenTagPicker: (anchorEl: HTMLButtonElement, item: Item) => void  // tells App to open picker
}
// Note: SectionCard builds ItemRow's onOpenTagPicker by wrapping it:
//   onOpenTagPicker={(anchorEl) => props.onOpenTagPicker(anchorEl, item)}
// This keeps ItemRow unaware of which item it is from App's perspective.

// ItemRow
interface ItemRowProps {
  item: Item
  visible: boolean
  // When false, ItemRow applies className="hidden" (display:none) — NOT return null.
  // This preserves local notes-panel open/closed state across search filter changes.
  onToggle: () => void
  onUpdateText: (text: string) => void
  onDelete: () => void
  onAddTag: (tag: TagKey) => void
  onRemoveTag: (tag: TagKey) => void
  onAddNote: (text: string) => void
  onDeleteNote: (noteId: string) => void
  onOpenTagPicker: (anchorEl: HTMLButtonElement) => void
  // item is already in scope; SectionCard supplies the item via closure when building this prop
}

// TagPicker
interface TagPickerProps {
  item: Item                                        // to show active tags
  anchorEl: HTMLButtonElement                       // for positioning
  onToggleTag: (tag: TagKey) => void
  onClose: () => void
}

// ConfirmModal
interface ConfirmModalProps {
  title: string
  body: string
  onConfirm: () => void
  onClose: () => void
  confirmLabel?: string  // defaults to "Delete"; pass "Close" for error-only modals (onConfirm === onClose)
}

// SuccessModal
interface SuccessModalProps {
  title: string
  body: string
  onClose: () => void
}
```

## Modal & TagPicker State (owned by App)

```ts
// In App.tsx
type ConfirmState = {
  title: string
  body: string
  onConfirm: () => void
} | null

type SuccessState = {
  title: string
  body: string
} | null

type TagPickerState = {
  item: Item
  sectionId: string
  anchorEl: HTMLButtonElement
} | null

const [confirmState, setConfirmState] = useState<ConfirmState>(null)
const [successState, setSuccessState] = useState<SuccessState>(null)
const [tagPickerState, setTagPickerState] = useState<TagPickerState>(null)
```

**TagPicker single-instance policy:** Only one picker is open at a time. `tagPickerState` lives in `App`. When `onOpenTagPicker` is called from any `ItemRow`, App sets the new picker state, replacing any previously open one. The picker is conditionally rendered by App — not by `ItemRow`. Clicking outside calls `onClose` which sets `tagPickerState` to `null`.

**ConfirmModal policy:** All delete actions (section and item) call the shared `ConfirmModal` via `setConfirmState`. The `onConfirm` callback is a closure capturing the specific delete action to run.

## Component Details

### `App.tsx`
- Calls `useTracker()`
- Renders: page header (title only), `<StatsBar>`, `<Toolbar>` (search + add + export/import), sections list, empty state
- Owns `confirmState`, `successState`, `tagPickerState`
- Wires `SectionCard` props by partially applying `actions` with the correct `sectionId`
- `exportJSON` action returns stats; App opens `SuccessModal` with them

### `StatsBar`
- Pure display component; App computes `{ total, passed, pending, sections }` from `data.sections`
- Animated `transition-[width]` progress fill bar
- No internal state

### `Toolbar`
- Controlled search input — `value={search}` + `onChange` updates `useTracker`'s search string
- "Add section" button calls `onAddSection`
- "Export JSON" button calls `onExport`
- "Import JSON" is a `<label>` wrapping a hidden `<input type="file" accept=".json">` that calls `onImport(file)` on change

### `SectionCard`
- Chevron rotates on open/closed (CSS `transition-transform`)
- Editable title: `<input>` with `onBlur` commit
- Mini progress bar (hidden when ≤1 item, matching original)
- Renders `<ItemRow>` for each item; passes `visible={!search || item.text.toLowerCase().includes(search.toLowerCase())}`
- Add-item input: hidden by default, revealed on hover over "Add" button via Tailwind `w-0`→`w-52` transition

### `ItemRow`
- Checkbox triggers `onToggle`; checked items get `line-through` label styling
- Editable label: `<input>` with `onBlur` commit
- Tag badges: click-to-remove inline via `onRemoveTag`; tag button calls `onOpenTagPicker`
- Notes button: toggles inline notes panel (local `useState` — no portal needed)
- Comment dot indicator shown when `item.notes.length > 0`
- Delete button: calls `onDelete` (which triggers ConfirmModal in App)

### `TagPicker`
- Rendered via `createPortal` into `document.body` by App when `tagPickerState !== null`
- Positioned via `getBoundingClientRect()` of `anchorEl` in a `useLayoutEffect`
- Closes on outside click via `useEffect` adding a `click` listener to `document`
- Shows checkmark next to active tags; clicking a tag calls `onToggleTag`

### `ConfirmModal` / `SuccessModal`
- Rendered via `createPortal` by App when state is non-null
- `SuccessModal` plays CSS keyframe animations for circle pop + checkmark draw (preserved from original)

## Improvements Over Original

| Original | Improved |
|---|---|
| Modals manipulated imperatively via `document.getElementById` | Proper React portals with controlled open/close state |
| Tag picker positioned with manual fixed offsets | Same positioning logic but in a clean `useEffect` |
| Inline `style=` strings everywhere | Tailwind utility classes |
| `data` object mutated in place, then `save()` called | Immutable state updates via `useState` setter |
| No TypeScript | Strict TypeScript throughout |
| `render()` rebuilds entire DOM on every change | React handles reconciliation efficiently |
| `alert()` for import errors | Proper inline error display or modal |

## LocalStorage Compatibility

The key `release_tracker_v1` and data shape are preserved exactly — existing saved data will load without migration.

## Tailwind v4 Setup

1. Install: `pnpm add -D tailwindcss @tailwindcss/vite`
2. Add plugin to `vite.config.ts`: `import tailwindcss from '@tailwindcss/vite'`
3. Replace `index.css` content with `@import "tailwindcss";` + `@theme { ... }`
4. Remove `App.css` and its import from `App.tsx`
