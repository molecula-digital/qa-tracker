# Release Tracker Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `release_tracker.html` into the Vite/React/TypeScript project with Tailwind v4, hooks, and components preserving visual and feature parity.

**Architecture:** `useTracker` hook owns all state via `useLocalStorage` and exposes typed action methods. `App.tsx` owns overlay state (modals, TagPicker) and wires everything together. All overlays are React portals rendered at `document.body`.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS v4 (`@tailwindcss/vite`), Vitest + @testing-library/react for hook tests, pnpm.

---

## Chunk 1: Foundation

### Task 1: Tailwind v4 + Vitest setup

**Files:**
- Modify: `vite.config.ts`
- Modify: `src/index.css`
- Create: `src/test/setup.ts`
- Modify: `tsconfig.app.json`

- [ ] **Step 1: Install dependencies**

```bash
pnpm add -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom jsdom
```

Expected: packages installed, `pnpm-lock.yaml` updated.

- [ ] **Step 2: Replace `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 3: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Update `tsconfig.app.json` — append vitest/globals to existing types array**

The existing `compilerOptions.types` array likely contains `"vite/client"`. **Append** to it, do not replace:
```json
"types": ["vite/client", "vitest/globals"]
```
If `"types"` does not yet exist in `compilerOptions`, add the full array. Either way, `"vite/client"` must be preserved.

- [ ] **Step 5: Replace `src/index.css`**

```css
@import "tailwindcss";

@theme {
  --color-bg:      #faf8f3;
  --color-surface: #f2ede3;
  --color-border:  #ddd5c2;
  --color-text:    #3a3228;
  --color-muted:   #8a7d6e;
  --color-accent:  #7a8c5c;
  --color-track:   #e8e0d0;
  --color-danger:  #a33333;
  --font-serif:    Georgia, 'Times New Roman', serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #faf8f3; }

/* SuccessModal keyframe animations (cannot be expressed as Tailwind utilities) */
@keyframes pop-circle {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
@keyframes draw-check {
  from { stroke-dashoffset: 50; }
  to   { stroke-dashoffset: 0;  }
}
.animate-pop-circle {
  animation: pop-circle 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.animate-draw-check {
  stroke-dasharray: 50;
  stroke-dashoffset: 50;
  animation: draw-check 0.35s 0.25s ease forwards;
}
```

- [ ] **Step 6: Delete `src/App.css`**

```bash
rm src/App.css
```

- [ ] **Step 7: Add `test` script to `package.json`**

In the `"scripts"` object add:
```json
"test": "vitest"
```

- [ ] **Step 8: Verify dev server starts**

```bash
pnpm dev
```

Expected: server starts on localhost, no errors in terminal or browser console.

- [ ] **Step 9: Verify test runner starts**

```bash
pnpm test
```

Expected: vitest starts and reports "No test files found" (0 tests pass, 0 fail).

- [ ] **Step 10: Initialize git and commit**

```bash
git init
git add vite.config.ts src/index.css src/test/setup.ts tsconfig.app.json package.json pnpm-lock.yaml
git commit -m "chore: add tailwind v4 and vitest"
```

---

### Task 2: Types

**Files:**
- Create: `src/types/tracker.ts`

- [ ] **Step 1: Create `src/types/tracker.ts`**

```ts
export type TagKey = 'bug' | 'question' | 'later'

export interface Note {
  id: string
  text: string
  ts: number
}

export interface Item {
  id: string
  text: string
  checked: boolean
  tags: TagKey[]
  notes: Note[]
}

export interface Section {
  id: string
  title: string
  items: Item[]
  open: boolean
}

export interface TrackerData {
  sections: Section[]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/tracker.ts
git commit -m "feat: add tracker data types"
```

---

### Task 3: `useLocalStorage` hook (TDD)

**Files:**
- Create: `src/hooks/useLocalStorage.test.ts`
- Create: `src/hooks/useLocalStorage.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useLocalStorage.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useLocalStorage } from './useLocalStorage'

const mockStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true })

describe('useLocalStorage', () => {
  beforeEach(() => mockStorage.clear())

  it('returns default value when nothing is stored', () => {
    const { result } = renderHook(() => useLocalStorage('k', 42))
    expect(result.current[0]).toBe(42)
  })

  it('loads existing value from localStorage', () => {
    mockStorage.setItem('k', '99')
    const { result } = renderHook(() => useLocalStorage('k', 0))
    expect(result.current[0]).toBe(99)
  })

  it('persists a direct value to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('k', 0))
    act(() => result.current[1](7))
    expect(result.current[0]).toBe(7)
    expect(mockStorage.getItem('k')).toBe('7')
  })

  it('supports updater function form and persists result', () => {
    const { result } = renderHook(() => useLocalStorage('k', 10))
    act(() => result.current[1](prev => prev + 5))
    expect(result.current[0]).toBe(15)
    expect(mockStorage.getItem('k')).toBe('15')
  })

  it('falls back to default on invalid JSON', () => {
    mockStorage.setItem('k', 'not-json{{{')
    const { result } = renderHook(() => useLocalStorage('k', 'default'))
    expect(result.current[0]).toBe('default')
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pnpm test --run src/hooks/useLocalStorage.test.ts
```

Expected: FAIL — `Cannot find module './useLocalStorage'`

- [ ] **Step 3: Implement `src/hooks/useLocalStorage.ts`**

> **Important:** Do NOT call `localStorage.setItem` inside React's `setState` updater — React Strict Mode double-invokes updaters to detect side effects, which would cause double writes. Instead, resolve `newValue` outside of React's setState (using a ref to track current value), then call both `setState` and `localStorage.setItem` as two independent sequential calls.

```ts
import { useState, useCallback, useRef } from 'react'

type SetValue<T> = (value: T | ((prev: T) => T)) => void

export function useLocalStorage<T>(key: string, defaultValue: T): [T, SetValue<T>] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? (JSON.parse(item) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  // Ref mirrors state so setValue can read current value without stale closure
  const stateRef = useRef(state)
  stateRef.current = state

  const setValue = useCallback<SetValue<T>>(
    (value) => {
      // Resolve new value outside of React's setState — no side effects inside updater
      const newValue =
        typeof value === 'function'
          ? (value as (prev: T) => T)(stateRef.current)
          : value
      setState(newValue)
      try {
        localStorage.setItem(key, JSON.stringify(newValue))
      } catch { /* ignore quota errors */ }
    },
    [key],
  )

  return [state, setValue]
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pnpm test --run src/hooks/useLocalStorage.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useLocalStorage.ts src/hooks/useLocalStorage.test.ts
git commit -m "feat: add useLocalStorage hook"
```

---

### Task 4: `useTracker` hook (TDD)

**Files:**
- Create: `src/hooks/useTracker.test.ts`
- Create: `src/hooks/useTracker.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useTracker.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useTracker } from './useTracker'

// Re-use same localStorage mock from useLocalStorage tests
const mockStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true })

describe('useTracker actions', () => {
  beforeEach(() => mockStorage.clear())

  it('starts with empty sections', () => {
    const { result } = renderHook(() => useTracker())
    expect(result.current.data.sections).toEqual([])
  })

  it('addSection adds a section with open:true', () => {
    const { result } = renderHook(() => useTracker())
    act(() => result.current.actions.addSection())
    expect(result.current.data.sections).toHaveLength(1)
    expect(result.current.data.sections[0].open).toBe(true)
    expect(result.current.data.sections[0].items).toEqual([])
  })

  it('deleteSection removes the correct section', () => {
    const { result } = renderHook(() => useTracker())
    act(() => result.current.actions.addSection())
    act(() => result.current.actions.addSection())
    const id = result.current.data.sections[0].id
    act(() => result.current.actions.deleteSection(id))
    expect(result.current.data.sections).toHaveLength(1)
    expect(result.current.data.sections[0].id).not.toBe(id)
  })

  it('addItem adds an item to the correct section', () => {
    const { result } = renderHook(() => useTracker())
    act(() => result.current.actions.addSection())
    const secId = result.current.data.sections[0].id
    act(() => result.current.actions.addItem(secId, 'Test item'))
    expect(result.current.data.sections[0].items).toHaveLength(1)
    expect(result.current.data.sections[0].items[0].text).toBe('Test item')
    expect(result.current.data.sections[0].items[0].checked).toBe(false)
  })

  it('toggleItem flips checked state', () => {
    const { result } = renderHook(() => useTracker())
    act(() => result.current.actions.addSection())
    const secId = result.current.data.sections[0].id
    act(() => result.current.actions.addItem(secId, 'item'))
    const itemId = result.current.data.sections[0].items[0].id
    act(() => result.current.actions.toggleItem(secId, itemId))
    expect(result.current.data.sections[0].items[0].checked).toBe(true)
    act(() => result.current.actions.toggleItem(secId, itemId))
    expect(result.current.data.sections[0].items[0].checked).toBe(false)
  })

  it('addTag and removeTag work correctly', () => {
    const { result } = renderHook(() => useTracker())
    act(() => result.current.actions.addSection())
    const secId = result.current.data.sections[0].id
    act(() => result.current.actions.addItem(secId, 'item'))
    const itemId = result.current.data.sections[0].items[0].id
    act(() => result.current.actions.addTag(secId, itemId, 'bug'))
    expect(result.current.data.sections[0].items[0].tags).toContain('bug')
    act(() => result.current.actions.removeTag(secId, itemId, 'bug'))
    expect(result.current.data.sections[0].items[0].tags).not.toContain('bug')
  })

  it('addNote and deleteNote work correctly', () => {
    const { result } = renderHook(() => useTracker())
    act(() => result.current.actions.addSection())
    const secId = result.current.data.sections[0].id
    act(() => result.current.actions.addItem(secId, 'item'))
    const itemId = result.current.data.sections[0].items[0].id
    act(() => result.current.actions.addNote(secId, itemId, 'my note'))
    const notes = result.current.data.sections[0].items[0].notes
    expect(notes).toHaveLength(1)
    expect(notes[0].text).toBe('my note')
    act(() => result.current.actions.deleteNote(secId, itemId, notes[0].id))
    expect(result.current.data.sections[0].items[0].notes).toHaveLength(0)
  })

  it('search state updates via setSearch', () => {
    const { result } = renderHook(() => useTracker())
    act(() => result.current.setSearch('hello'))
    expect(result.current.search).toBe('hello')
  })

  it('persists data to localStorage key release_tracker_v1', () => {
    const { result } = renderHook(() => useTracker())
    act(() => result.current.actions.addSection())
    const stored = JSON.parse(mockStorage.getItem('release_tracker_v1')!)
    expect(stored.sections).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pnpm test --run src/hooks/useTracker.test.ts
```

Expected: FAIL — `Cannot find module './useTracker'`

- [ ] **Step 3: Implement `src/hooks/useTracker.ts`**

```ts
import { useState } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { TrackerData, Section, Item, TagKey, Note } from '../types/tracker'

const uid = () => 'id' + (Date.now() % 1e9) + ((Math.random() * 1e4) | 0)

const DEFAULT_DATA: TrackerData = { sections: [] }

// Immutable helpers
function mapSection(
  data: TrackerData,
  sectionId: string,
  fn: (s: Section) => Section,
): TrackerData {
  return {
    ...data,
    sections: data.sections.map((s) => (s.id === sectionId ? fn(s) : s)),
  }
}

function mapItem(
  data: TrackerData,
  sectionId: string,
  itemId: string,
  fn: (i: Item) => Item,
): TrackerData {
  return mapSection(data, sectionId, (sec) => ({
    ...sec,
    items: sec.items.map((i) => (i.id === itemId ? fn(i) : i)),
  }))
}

export function useTracker() {
  const [data, setData] = useLocalStorage<TrackerData>('release_tracker_v1', DEFAULT_DATA)
  const [search, setSearch] = useState('')

  const actions = {
    addSection: () => {
      const sec: Section = { id: uid(), title: 'New section', items: [], open: true }
      setData((prev) => ({ ...prev, sections: [...prev.sections, sec] }))
    },

    deleteSection: (sectionId: string) => {
      setData((prev) => ({
        ...prev,
        sections: prev.sections.filter((s) => s.id !== sectionId),
      }))
    },

    updateSectionTitle: (sectionId: string, title: string) => {
      setData((prev) => mapSection(prev, sectionId, (s) => ({ ...s, title })))
    },

    toggleSection: (sectionId: string) => {
      setData((prev) =>
        mapSection(prev, sectionId, (s) => ({ ...s, open: !s.open })),
      )
    },

    addItem: (sectionId: string, text: string) => {
      const item: Item = { id: uid(), text, checked: false, tags: [], notes: [] }
      setData((prev) =>
        mapSection(prev, sectionId, (s) => ({ ...s, items: [...s.items, item] })),
      )
    },

    deleteItem: (sectionId: string, itemId: string) => {
      setData((prev) =>
        mapSection(prev, sectionId, (s) => ({
          ...s,
          items: s.items.filter((i) => i.id !== itemId),
        })),
      )
    },

    toggleItem: (sectionId: string, itemId: string) => {
      setData((prev) =>
        mapItem(prev, sectionId, itemId, (i) => ({ ...i, checked: !i.checked })),
      )
    },

    updateItemText: (sectionId: string, itemId: string, text: string) => {
      setData((prev) => mapItem(prev, sectionId, itemId, (i) => ({ ...i, text })))
    },

    addTag: (sectionId: string, itemId: string, tag: TagKey) => {
      setData((prev) =>
        mapItem(prev, sectionId, itemId, (i) => ({
          ...i,
          tags: i.tags.includes(tag) ? i.tags : [...i.tags, tag],
        })),
      )
    },

    removeTag: (sectionId: string, itemId: string, tag: TagKey) => {
      setData((prev) =>
        mapItem(prev, sectionId, itemId, (i) => ({
          ...i,
          tags: i.tags.filter((t) => t !== tag),
        })),
      )
    },

    addNote: (sectionId: string, itemId: string, text: string) => {
      const note: Note = { id: uid(), text, ts: Date.now() }
      setData((prev) =>
        mapItem(prev, sectionId, itemId, (i) => ({
          ...i,
          notes: [...i.notes, note],
        })),
      )
    },

    deleteNote: (sectionId: string, itemId: string, noteId: string) => {
      setData((prev) =>
        mapItem(prev, sectionId, itemId, (i) => ({
          ...i,
          notes: i.notes.filter((n) => n.id !== noteId),
        })),
      )
    },

    exportJSON: (): { sections: number; total: number } => {
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `release-tracker-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a) }, 200)
      const total = data.sections.reduce((sum, s) => sum + s.items.length, 0)
      return { sections: data.sections.length, total }
    },

    importJSON: (file: File): Promise<void> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const parsed = JSON.parse(e.target!.result as string) as TrackerData
            if (!parsed || !Array.isArray(parsed.sections)) {
              reject(new Error('Invalid file format: missing sections array'))
              return
            }
            // Normalize for backwards compatibility (same as original)
            parsed.sections.forEach((sec) => {
              if (!sec.id) sec.id = uid()
              sec.items.forEach((it) => {
                if (!it.id) it.id = uid()
                if (!it.tags) it.tags = []
                if (!it.notes) it.notes = []
              })
            })
            setData(parsed)
            resolve()
          } catch {
            reject(new Error('Could not parse JSON file'))
          }
        }
        reader.onerror = () => reject(new Error('Could not read file'))
        reader.readAsText(file)
      })
    },
  }

  return { data, search, setSearch, actions }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pnpm test --run src/hooks/useTracker.test.ts
```

Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTracker.ts src/hooks/useTracker.test.ts
git commit -m "feat: add useTracker hook with full CRUD actions"
```

---

## Chunk 2: Portals

### Task 5: Icons

**Files:**
- Create: `src/components/Icons.tsx`

- [ ] **Step 1: Create `src/components/Icons.tsx`**

These are tiny SVG components used throughout. All use `currentColor` and `stroke` so they inherit text color.

```tsx
type IconProps = { className?: string }
const base = 'inline-block flex-shrink-0'

export const ChevronIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ''}`} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
export const TrashIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ''}`} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
)
export const XIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
export const PlusIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ''}`} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
export const MsgIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ''}`} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
)
export const TagIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ''}`} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
)
export const BugIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2l1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 016 0v1" /><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6z" /><path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5" /><path d="M6 13H2" /><path d="M3 21c0-2 1.5-6 6-6" /><path d="M17.47 9c1.93-.2 3.53-1.9 3.53-4" /><path d="M18 13h4" /><path d="M21 21c0-2-1.5-6-6-6" />
  </svg>
)
export const QuestionIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)
export const ClockIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)
export const DownloadIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)
export const UploadIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 14 12 9 17 14" /><line x1="12" y1="9" x2="12" y2="21" />
  </svg>
)
export const SearchIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
export const ChecklistIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ''}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
)
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Icons.tsx
git commit -m "feat: add SVG icon components"
```

---

### Task 6: `ConfirmModal`

**Files:**
- Create: `src/components/ConfirmModal.tsx`
- Create: `src/components/ConfirmModal.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/ConfirmModal.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ConfirmModal } from './ConfirmModal'

describe('ConfirmModal', () => {
  it('renders title, body, and default Delete button', () => {
    render(
      <ConfirmModal
        title="Delete section"
        body="Are you sure?"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('Delete section')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('uses confirmLabel when provided', () => {
    render(
      <ConfirmModal
        title="Error"
        body="Something went wrong"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        confirmLabel="Close"
      />
    )
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('hides Cancel button when hideCancel is true', () => {
    render(
      <ConfirmModal
        title="Error"
        body="msg"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        confirmLabel="Close"
        hideCancel
      />
    )
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmModal title="t" body="b" onConfirm={onConfirm} onClose={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn()
    render(
      <ConfirmModal title="t" body="b" onConfirm={vi.fn()} onClose={onClose} />
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
pnpm test --run src/components/ConfirmModal.test.tsx
```

Expected: FAIL — `Cannot find module './ConfirmModal'`

- [ ] **Step 3: Implement `src/components/ConfirmModal.tsx`**

```tsx
import { createPortal } from 'react-dom'
import { TrashIcon } from './Icons'

interface ConfirmModalProps {
  title: string
  body: string
  onConfirm: () => void
  onClose: () => void
  confirmLabel?: string  // defaults to 'Delete'
  hideCancel?: boolean   // true for error-only modals — shows only the confirm button
}

export function ConfirmModal({
  title,
  body,
  onConfirm,
  onClose,
  confirmLabel = 'Delete',
  hideCancel = false,
}: ConfirmModalProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ background: 'rgba(40,30,20,.35)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-bg border border-border rounded-[14px] p-6 max-w-[360px] w-[calc(100%-2rem)] shadow-[0_12px_40px_rgba(0,0,0,.14)]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-danger flex-shrink-0"><TrashIcon /></span>
          <h3 className="text-base font-medium text-text">{title}</h3>
        </div>
        <p className="text-[13px] text-muted leading-relaxed mb-5">{body}</p>
        <div className="flex gap-2 justify-end">
          {!hideCancel && (
            <button
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-border rounded-lg bg-bg text-[13px] text-text cursor-pointer hover:bg-surface hover:border-[#b8ad9e] font-[inherit]"
              onClick={onClose}
            >
              Cancel
            </button>
          )}
          <button
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-danger rounded-lg bg-danger text-[13px] text-bg cursor-pointer hover:opacity-90 font-[inherit]"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
pnpm test --run src/components/ConfirmModal.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ConfirmModal.tsx src/components/ConfirmModal.test.tsx
git commit -m "feat: add ConfirmModal portal component"
```

---

### Task 7: `SuccessModal`

**Files:**
- Create: `src/components/SuccessModal.tsx`
- Create: `src/components/SuccessModal.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/SuccessModal.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SuccessModal } from './SuccessModal'

describe('SuccessModal', () => {
  it('renders title and body', () => {
    render(<SuccessModal title="Export complete" body="Saved 2 section(s)" onClose={vi.fn()} />)
    expect(screen.getByText('Export complete')).toBeInTheDocument()
    expect(screen.getByText('Saved 2 section(s)')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<SuccessModal title="t" body="b" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<SuccessModal title="t" body="b" onClose={onClose} />)
    // The overlay is the portal root div
    fireEvent.click(container.querySelector('[data-testid="success-overlay"]')!)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
pnpm test --run src/components/SuccessModal.test.tsx
```

Expected: FAIL — `Cannot find module './SuccessModal'`

- [ ] **Step 3: Implement `src/components/SuccessModal.tsx`**

```tsx
import { createPortal } from 'react-dom'

interface SuccessModalProps {
  title: string
  body: string
  onClose: () => void
}

export function SuccessModal({ title, body, onClose }: SuccessModalProps) {
  return createPortal(
    <div
      data-testid="success-overlay"
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ background: 'rgba(40,30,20,.35)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-bg border border-border rounded-[14px] p-8 max-w-[360px] w-[calc(100%-2rem)] shadow-[0_12px_40px_rgba(0,0,0,.14)] flex flex-col items-center text-center gap-4">
        <svg
          className="animate-pop-circle"
          width="56" height="56" viewBox="0 0 56 56" fill="none"
        >
          <circle cx="28" cy="28" r="26" fill="#e0ead4" stroke="#7a8c5c" strokeWidth="1.5" />
          <path
            className="animate-draw-check"
            d="M17 28.5l8 8 14-15"
            stroke="#7a8c5c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <div>
          <h3 className="text-base font-medium text-text mb-1">{title}</h3>
          <p className="text-[13px] text-muted leading-relaxed">{body}</p>
        </div>
        <button
          aria-label="Close"
          className="px-4 py-2 border border-border rounded-lg bg-bg text-[13px] text-text cursor-pointer hover:bg-surface hover:border-[#b8ad9e] font-[inherit]"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>,
    document.body,
  )
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
pnpm test --run src/components/SuccessModal.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/SuccessModal.tsx src/components/SuccessModal.test.tsx
git commit -m "feat: add SuccessModal portal component with animations"
```

---

### Task 8: `TagPicker`

**Files:**
- Create: `src/components/TagPicker.tsx`
- Create: `src/components/TagPicker.test.tsx`

The tag configuration lives in this file as a module-level constant since it's only used here.

- [ ] **Step 1: Write the failing test**

Create `src/components/TagPicker.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TagPicker } from './TagPicker'
import type { Item } from '../types/tracker'

const baseItem: Item = {
  id: 'i1', text: 'Test', checked: false, tags: [], notes: [],
}
const anchorEl = document.createElement('button')

describe('TagPicker', () => {
  it('renders all three tag options', () => {
    render(
      <TagPicker item={baseItem} anchorEl={anchorEl} onToggleTag={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.getByText('Bug')).toBeInTheDocument()
    expect(screen.getByText('Question')).toBeInTheDocument()
    expect(screen.getByText('Later')).toBeInTheDocument()
  })

  it('calls onToggleTag when a tag option is clicked', () => {
    const onToggleTag = vi.fn()
    render(
      <TagPicker item={baseItem} anchorEl={anchorEl} onToggleTag={onToggleTag} onClose={vi.fn()} />
    )
    fireEvent.click(screen.getByText('Bug'))
    expect(onToggleTag).toHaveBeenCalledWith('bug')
  })

  it('shows checkmark for active tags', () => {
    const itemWithBug: Item = { ...baseItem, tags: ['bug'] }
    render(
      <TagPicker item={itemWithBug} anchorEl={anchorEl} onToggleTag={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.getByText('✓')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
pnpm test --run src/components/TagPicker.test.tsx
```

Expected: FAIL — `Cannot find module './TagPicker'`

- [ ] **Step 3: Implement `src/components/TagPicker.tsx`**

```tsx
import { useLayoutEffect, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Item, TagKey } from '../types/tracker'
import { BugIcon, QuestionIcon, ClockIcon } from './Icons'

interface TagConfig {
  label: string
  dotColor: string
  icon: React.ReactNode
}

const TAGS: Record<TagKey, TagConfig> = {
  bug:      { label: 'Bug',      dotColor: '#c44444', icon: <BugIcon /> },
  question: { label: 'Question', dotColor: '#c48a00', icon: <QuestionIcon /> },
  later:    { label: 'Later',    dotColor: '#2a6ab8', icon: <ClockIcon /> },
}

interface TagPickerProps {
  item: Item
  anchorEl: HTMLButtonElement
  onToggleTag: (tag: TagKey) => void
  onClose: () => void
}

export function TagPicker({ item, anchorEl, onToggleTag, onClose }: TagPickerProps) {
  const popupRef = useRef<HTMLDivElement>(null)

  // Position relative to anchor
  useLayoutEffect(() => {
    const popup = popupRef.current
    if (!popup) return
    const r = anchorEl.getBoundingClientRect()
    const pw = 148, ph = popup.offsetHeight || 120
    let left = r.left, top = r.bottom + 6
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8
    if (top + ph > window.innerHeight - 8) top = r.top - ph - 6
    popup.style.left = Math.max(8, left) + 'px'
    popup.style.top = Math.max(8, top) + 'px'
  })

  // Close on outside click
  useEffect(() => {
    const handler = () => onClose()
    // defer so the click that opened the picker doesn't immediately close it
    const timer = setTimeout(() => document.addEventListener('click', handler), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handler)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={popupRef}
      className="fixed z-[9999] bg-bg border border-border rounded-[10px] p-1.5 flex flex-col gap-1.5 min-w-[140px] shadow-[0_8px_24px_rgba(0,0,0,.12)]"
      onClick={(e) => e.stopPropagation()}
    >
      {(Object.entries(TAGS) as [TagKey, TagConfig][]).map(([key, cfg]) => {
        const active = item.tags.includes(key)
        return (
          <div
            key={key}
            className={`flex items-center gap-1.5 text-[13px] px-2.5 py-1.5 rounded-lg cursor-pointer border border-transparent hover:bg-surface text-text whitespace-nowrap transition-colors ${active ? 'bg-surface font-medium' : ''}`}
            onClick={() => onToggleTag(key)}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: cfg.dotColor }}
            />
            {cfg.label}
            {active && (
              <span className="ml-auto text-[11px] text-muted">✓</span>
            )}
          </div>
        )
      })}
    </div>,
    document.body,
  )
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
pnpm test --run src/components/TagPicker.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/TagPicker.tsx src/components/TagPicker.test.tsx
git commit -m "feat: add TagPicker portal component"
```

---

## Chunk 3: Core Components

### Task 9: `StatsBar`

**Files:**
- Create: `src/components/StatsBar.tsx`
- Create: `src/components/StatsBar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/StatsBar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatsBar } from './StatsBar'

describe('StatsBar', () => {
  it('displays all four stat values', () => {
    render(<StatsBar total={10} passed={7} pending={3} sections={2} />)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows 70% for 7/10 passed', () => {
    render(<StatsBar total={10} passed={7} pending={3} sections={2} />)
    expect(screen.getByText('70%')).toBeInTheDocument()
  })

  it('shows 0% when total is 0', () => {
    render(<StatsBar total={0} passed={0} pending={0} sections={0} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
pnpm test --run src/components/StatsBar.test.tsx
```

Expected: FAIL — `Cannot find module './StatsBar'`

- [ ] **Step 3: Implement `src/components/StatsBar.tsx`**

```tsx
interface StatsBarProps {
  total: number
  passed: number
  pending: number
  sections: number
}

export function StatsBar({ total, passed, pending, sections }: StatsBarProps) {
  const pct = total ? Math.round((passed / total) * 100) : 0

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-5">
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total tests', value: total, color: undefined },
          { label: 'Passed',      value: passed,  color: 'text-accent' },
          { label: 'Pending',     value: pending,  color: 'text-[#b08a3e]' },
          { label: 'Sections',    value: sections, color: undefined },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-bg rounded-lg p-3 border border-border">
            <div className="text-[12px] text-muted mb-1">{label}</div>
            <div className={`text-[22px] font-medium text-text ${color ?? ''}`}>{value}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-[10px] bg-track rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[14px] font-medium text-text min-w-[36px] text-right">{pct}%</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
pnpm test --run src/components/StatsBar.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/StatsBar.tsx src/components/StatsBar.test.tsx
git commit -m "feat: add StatsBar component"
```

---

### Task 10: `Toolbar`

**Files:**
- Create: `src/components/Toolbar.tsx`
- Create: `src/components/Toolbar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/Toolbar.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Toolbar } from './Toolbar'

describe('Toolbar', () => {
  const defaultProps = {
    search: '',
    onSearchChange: vi.fn(),
    onAddSection: vi.fn(),
    onExport: vi.fn(),
    onImport: vi.fn(),
  }

  it('renders search input, add, export, and import controls', () => {
    render(<Toolbar {...defaultProps} />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add section/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
    expect(screen.getByText(/import/i)).toBeInTheDocument()
  })

  it('calls onSearchChange when typing in search', () => {
    const onSearchChange = vi.fn()
    render(<Toolbar {...defaultProps} onSearchChange={onSearchChange} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'hello' } })
    expect(onSearchChange).toHaveBeenCalledWith('hello')
  })

  it('calls onAddSection when Add section clicked', () => {
    const onAddSection = vi.fn()
    render(<Toolbar {...defaultProps} onAddSection={onAddSection} />)
    fireEvent.click(screen.getByRole('button', { name: /add section/i }))
    expect(onAddSection).toHaveBeenCalledOnce()
  })

  it('calls onExport when Export JSON clicked', () => {
    const onExport = vi.fn()
    render(<Toolbar {...defaultProps} onExport={onExport} />)
    fireEvent.click(screen.getByRole('button', { name: /export/i }))
    expect(onExport).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
pnpm test --run src/components/Toolbar.test.tsx
```

Expected: FAIL — `Cannot find module './Toolbar'`

- [ ] **Step 3: Implement `src/components/Toolbar.tsx`**

```tsx
import { useRef } from 'react'
import { SearchIcon, PlusIcon, DownloadIcon, UploadIcon } from './Icons'

interface ToolbarProps {
  search: string
  onSearchChange: (q: string) => void
  onAddSection: () => void
  onExport: () => void
  onImport: (file: File) => void
}

export function Toolbar({ search, onSearchChange, onAddSection, onExport, onImport }: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const btnBase = 'inline-flex items-center gap-1.5 px-3.5 py-2 border border-border rounded-lg bg-bg text-[13px] text-text cursor-pointer hover:bg-surface hover:border-[#b8ad9e] font-[inherit] whitespace-nowrap transition-colors leading-none'

  return (
    <div className="flex gap-2 flex-wrap mb-5 items-center">
      {/* Search */}
      <div className="flex-1 min-w-[160px] flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-bg hover:border-[#b8ad9e] focus-within:border-accent focus-within:bg-white transition-colors">
        <SearchIcon className="text-muted flex-shrink-0" />
        <input
          type="text"
          placeholder="Search tests…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="border-none outline-none bg-transparent text-[14px] text-text w-full font-[inherit] p-0"
        />
      </div>

      {/* Export */}
      <button className={btnBase} onClick={onExport} aria-label="Export JSON">
        <DownloadIcon /> Export JSON
      </button>

      {/* Import */}
      <label className={`${btnBase} cursor-pointer`}>
        <UploadIcon /> Import JSON
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              onImport(file)
              // Reset so the same file can be re-imported
              e.target.value = ''
            }
          }}
        />
      </label>

      {/* Add section */}
      <button
        className={`${btnBase} bg-accent text-bg border-accent hover:bg-[#6a7a4e] hover:border-[#6a7a4e]`}
        onClick={onAddSection}
        aria-label="Add section"
      >
        <PlusIcon /> Add section
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
pnpm test --run src/components/Toolbar.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Toolbar.tsx src/components/Toolbar.test.tsx
git commit -m "feat: add Toolbar component"
```

---

### Task 11: `ItemRow`

**Files:**
- Create: `src/components/ItemRow.tsx`
- Create: `src/components/ItemRow.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/ItemRow.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ItemRow } from './ItemRow'
import type { Item } from '../types/tracker'

const baseItem: Item = {
  id: 'i1', text: 'Login flow', checked: false, tags: [], notes: [],
}

const defaultProps = {
  item: baseItem,
  visible: true,
  onToggle: vi.fn(),
  onUpdateText: vi.fn(),
  onDelete: vi.fn(),
  onAddTag: vi.fn(),
  onRemoveTag: vi.fn(),
  onAddNote: vi.fn(),
  onDeleteNote: vi.fn(),
  onOpenTagPicker: vi.fn(),
}

describe('ItemRow', () => {
  it('renders item text', () => {
    render(<ItemRow {...defaultProps} />)
    expect(screen.getByDisplayValue('Login flow')).toBeInTheDocument()
  })

  it('applies hidden class when visible is false (does NOT unmount)', () => {
    const { container } = render(<ItemRow {...defaultProps} visible={false} />)
    expect(container.firstChild).toHaveClass('hidden')
    // Input still in DOM — local state preserved
    expect(screen.getByDisplayValue('Login flow')).toBeInTheDocument()
  })

  it('calls onToggle when checkbox clicked', () => {
    const onToggle = vi.fn()
    render(<ItemRow {...defaultProps} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('shows line-through on label when checked', () => {
    const checked: Item = { ...baseItem, checked: true }
    render(<ItemRow {...defaultProps} item={checked} />)
    expect(screen.getByDisplayValue('Login flow')).toHaveClass('line-through')
  })

  it('shows tag badges for active tags', () => {
    const tagged: Item = { ...baseItem, tags: ['bug'] }
    render(<ItemRow {...defaultProps} item={tagged} />)
    expect(screen.getByText('Bug')).toBeInTheDocument()
  })

  it('shows comment dot when item has notes', () => {
    const noted: Item = { ...baseItem, notes: [{ id: 'n1', text: 'note', ts: 0 }] }
    const { container } = render(<ItemRow {...defaultProps} item={noted} />)
    // The dot has title="Has comments"
    expect(container.querySelector('[title="Has comments"]')).toBeInTheDocument()
  })

  it('toggles notes panel open on notes button click', () => {
    render(<ItemRow {...defaultProps} />)
    const notesBtn = screen.getByTitle(/comments/i)
    fireEvent.click(notesBtn)
    expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
pnpm test --run src/components/ItemRow.test.tsx
```

Expected: FAIL — `Cannot find module './ItemRow'`

- [ ] **Step 3: Implement `src/components/ItemRow.tsx`**

```tsx
import { useState, useRef } from 'react'
import type { Item, TagKey } from '../types/tracker'
import { TagIcon, MsgIcon, XIcon, BugIcon, QuestionIcon, ClockIcon } from './Icons'

const TAG_CFG = {
  bug:      { label: 'Bug',      cls: 'bg-[#fde8e8] text-[#922222] border-[#f5c4c4]', icon: <BugIcon /> },
  question: { label: 'Question', cls: 'bg-[#fef3dc] text-[#7a5000] border-[#f5dfa0]', icon: <QuestionIcon /> },
  later:    { label: 'Later',    cls: 'bg-[#e6eef8] text-[#1a4a80] border-[#b8d0ee]', icon: <ClockIcon /> },
} as const

const iactBtn = 'inline-flex items-center justify-center w-[26px] h-[26px] border border-transparent rounded-md bg-transparent cursor-pointer text-muted hover:bg-track hover:border-border hover:text-text transition-colors p-0 flex-shrink-0'

interface ItemRowProps {
  item: Item
  visible: boolean
  onToggle: () => void
  onUpdateText: (text: string) => void
  onDelete: () => void
  onAddTag: (tag: TagKey) => void
  onRemoveTag: (tag: TagKey) => void
  onAddNote: (text: string) => void
  onDeleteNote: (noteId: string) => void
  onOpenTagPicker: (anchorEl: HTMLButtonElement) => void
}

export function ItemRow({
  item,
  visible,
  onToggle,
  onUpdateText,
  onDelete,
  onAddTag,
  onRemoveTag,
  onAddNote,
  onDeleteNote,
  onOpenTagPicker,
}: ItemRowProps) {
  const [notesOpen, setNotesOpen] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const tagBtnRef = useRef<HTMLButtonElement>(null)

  const commitNote = () => {
    const v = noteInput.trim()
    if (!v) return
    onAddNote(v)
    setNoteInput('')
  }

  return (
    <div className={`rounded-lg ${!visible ? 'hidden' : ''}`}>
      {/* Main row */}
      <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg group hover:bg-surface transition-colors ${notesOpen ? 'rounded-b-none bg-[#f7f3ec]' : ''}`}>
        <input
          type="checkbox"
          checked={item.checked}
          onChange={onToggle}
          className="w-[15px] h-[15px] accent-accent cursor-pointer flex-shrink-0"
        />
        <input
          type="text"
          defaultValue={item.text}
          onBlur={(e) => onUpdateText(e.target.value)}
          className={`flex-1 text-[14px] border-none bg-transparent outline-none text-text font-[inherit] p-0 min-w-0 ${item.checked ? 'line-through text-muted' : ''}`}
        />

        {/* Comment dot */}
        {item.notes.length > 0 && (
          <span
            title="Has comments"
            className="w-[7px] h-[7px] rounded-full bg-accent flex-shrink-0"
          />
        )}

        {/* Tag badges */}
        <div className="flex gap-1 flex-wrap items-center">
          {item.tags.map((t) => (
            <span
              key={t}
              title="Click to remove"
              onClick={() => onRemoveTag(t)}
              className={`inline-flex items-center gap-[3px] text-[11px] px-[7px] py-[2px] rounded-full cursor-pointer border flex-shrink-0 hover:opacity-70 transition-opacity ${TAG_CFG[t].cls}`}
            >
              {TAG_CFG[t].icon} {TAG_CFG[t].label}
            </span>
          ))}
        </div>

        {/* Action buttons — visible on row hover or when panel open */}
        <div className={`flex items-center gap-[3px] flex-shrink-0 ${notesOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
          <button
            ref={tagBtnRef}
            title="Add tag"
            className={iactBtn}
            onClick={(e) => { e.stopPropagation(); onOpenTagPicker(tagBtnRef.current!) }}
          >
            <TagIcon />
          </button>
          <button
            title="Comments"
            className={`${iactBtn} ${notesOpen || item.notes.length > 0 ? 'text-accent bg-[#e0ead4] border-[#c4d9b0]' : ''}`}
            onClick={() => setNotesOpen((o) => !o)}
          >
            <MsgIcon />
          </button>
          <button
            title="Delete item"
            className={`${iactBtn} hover:bg-[#fdf0f0] hover:text-danger hover:border-[#e4b4b4]`}
            onClick={onDelete}
          >
            <XIcon />
          </button>
        </div>
      </div>

      {/* Notes panel — inline, no portal needed */}
      {notesOpen && (
        <div className="bg-[#f7f3ec] border-t border-[#e8e0d0] px-3 py-2">
          {/* Existing notes */}
          <div className="flex flex-col gap-1.5 mb-2">
            {item.notes.map((n) => (
              <div key={n.id} className="flex gap-2 items-start group/note">
                <div className="w-1.5 h-1.5 rounded-full bg-[#b0a090] mt-[6px] flex-shrink-0" />
                <span className="text-[13px] text-text flex-1 leading-[1.5]">{n.text}</span>
                <button
                  className="flex items-center px-1 py-0.5 border-none bg-transparent cursor-pointer text-[#c0a090] rounded opacity-0 group-hover/note:opacity-100 hover:text-danger hover:bg-[#fdf0f0] transition-opacity"
                  onClick={() => onDeleteNote(n.id)}
                >
                  <XIcon />
                </button>
              </div>
            ))}
          </div>
          {/* Add note */}
          <div className="flex gap-1.5">
            <input
              placeholder="Add a comment…"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitNote() }}
              className="flex-1 px-[11px] py-[7px] border border-border rounded-lg bg-white text-[13px] text-text outline-none font-[inherit] focus:border-accent transition-colors"
            />
            <button
              className="inline-flex items-center gap-1 px-3 py-[7px] border border-border rounded-lg bg-bg text-[12px] text-text cursor-pointer font-[inherit] hover:bg-surface hover:border-[#b8ad9e] flex-shrink-0 transition-colors"
              onClick={commitNote}
            >
              <XIcon className="hidden" />{/* spacer for alignment */}
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

> **Note:** The "Add" button in the notes panel uses a plain text label. Remove the hidden XIcon spacer — it was left accidentally. Just use `Add` text.

- [ ] **Step 4: Run test — expect pass**

```bash
pnpm test --run src/components/ItemRow.test.tsx
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ItemRow.tsx src/components/ItemRow.test.tsx
git commit -m "feat: add ItemRow component with notes panel"
```

---

### Task 12: `SectionCard`

**Files:**
- Create: `src/components/SectionCard.tsx`
- Create: `src/components/SectionCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/SectionCard.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SectionCard } from './SectionCard'
import type { Section } from '../types/tracker'

const section: Section = {
  id: 's1', title: 'Auth', open: true,
  items: [
    { id: 'i1', text: 'Login works', checked: true,  tags: [], notes: [] },
    { id: 'i2', text: 'Logout works', checked: false, tags: [], notes: [] },
  ],
}

const defaultProps = {
  section,
  search: '',
  onToggle: vi.fn(),
  onTitleChange: vi.fn(),
  onDelete: vi.fn(),
  onAddItem: vi.fn(),
  onDeleteItem: vi.fn(),
  onToggleItem: vi.fn(),
  onUpdateItemText: vi.fn(),
  onAddTag: vi.fn(),
  onRemoveTag: vi.fn(),
  onAddNote: vi.fn(),
  onDeleteNote: vi.fn(),
  onOpenTagPicker: vi.fn(),
}

describe('SectionCard', () => {
  it('renders the section title', () => {
    render(<SectionCard {...defaultProps} />)
    expect(screen.getByDisplayValue('Auth')).toBeInTheDocument()
  })

  it('renders badge showing done/total', () => {
    render(<SectionCard {...defaultProps} />)
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it('renders all items when open', () => {
    render(<SectionCard {...defaultProps} />)
    expect(screen.getByDisplayValue('Login works')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Logout works')).toBeInTheDocument()
  })

  it('hides body when section is closed', () => {
    const closed = { ...section, open: false }
    render(<SectionCard {...defaultProps} section={closed} />)
    expect(screen.queryByDisplayValue('Login works')).not.toBeInTheDocument()
  })

  it('filters items by search', () => {
    render(<SectionCard {...defaultProps} search="login" />)
    const loginInput = screen.getByDisplayValue('Login works')
    const logoutInput = screen.getByDisplayValue('Logout works')
    expect(loginInput.closest('.hidden')).toBeNull()         // login is visible
    expect(logoutInput.closest('.hidden')).not.toBeNull()    // logout is hidden
  })

  it('calls onToggle when header clicked', () => {
    const onToggle = vi.fn()
    render(<SectionCard {...defaultProps} onToggle={onToggle} />)
    fireEvent.click(screen.getByText('Auth').closest('div[class*="cursor-pointer"]')!)
    expect(onToggle).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
pnpm test --run src/components/SectionCard.test.tsx
```

Expected: FAIL — `Cannot find module './SectionCard'`

- [ ] **Step 3: Implement `src/components/SectionCard.tsx`**

```tsx
import { useState, useRef } from 'react'
import type { Section, Item, TagKey } from '../types/tracker'
import { ItemRow } from './ItemRow'
import { ChevronIcon, TrashIcon, PlusIcon } from './Icons'

interface SectionCardProps {
  section: Section
  search: string
  onToggle: () => void
  onTitleChange: (title: string) => void
  onDelete: () => void
  onAddItem: (text: string) => void
  onDeleteItem: (itemId: string) => void
  onToggleItem: (itemId: string) => void
  onUpdateItemText: (itemId: string, text: string) => void
  onAddTag: (itemId: string, tag: TagKey) => void
  onRemoveTag: (itemId: string, tag: TagKey) => void
  onAddNote: (itemId: string, text: string) => void
  onDeleteNote: (itemId: string, noteId: string) => void
  onOpenTagPicker: (anchorEl: HTMLButtonElement, item: Item) => void
}

export function SectionCard({
  section,
  search,
  onToggle,
  onTitleChange,
  onDelete,
  onAddItem,
  onDeleteItem,
  onToggleItem,
  onUpdateItemText,
  onAddTag,
  onRemoveTag,
  onAddNote,
  onDeleteNote,
  onOpenTagPicker,
}: SectionCardProps) {
  const [addInputVal, setAddInputVal] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)

  const done = section.items.filter((i) => i.checked).length
  const total = section.items.length
  const pct = total ? Math.round((done / total) * 100) : 0

  const commitAdd = () => {
    const v = addInputVal.trim()
    if (v) { onAddItem(v); setAddInputVal('') }
  }

  return (
    <div className="bg-bg border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3.5 py-2.5 bg-surface border-b border-border cursor-pointer select-none"
        onClick={onToggle}
      >
        <span className={`flex items-center text-muted flex-shrink-0 transition-transform duration-200 ${section.open ? 'rotate-90' : ''}`}>
          <ChevronIcon />
        </span>

        <input
          type="text"
          defaultValue={section.title}
          onBlur={(e) => onTitleChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="text-[15px] font-medium flex-1 border-none bg-transparent outline-none text-text font-[inherit] cursor-text min-w-0 px-1 py-0.5 rounded hover:bg-black/5 focus:bg-white focus:outline focus:outline-1 focus:outline-border"
        />

        {/* Mini bar — hidden for ≤1 item */}
        {total > 1 && (
          <div className="w-[72px] h-[6px] bg-track rounded-full overflow-hidden flex-shrink-0">
            <div
              className="h-full bg-accent rounded-full transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        <span className="text-[12px] text-muted bg-track rounded-full px-2.5 py-0.5 flex-shrink-0">
          {done}/{total}
        </span>

        <button
          className="inline-flex items-center gap-1.5 px-[7px] py-[5px] border border-transparent rounded-lg bg-transparent text-[13px] text-danger cursor-pointer hover:bg-[#fdf0f0] hover:border-[#e4b4b4] transition-colors"
          title="Delete section"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
        >
          <TrashIcon />
        </button>
      </div>

      {/* Body */}
      {section.open && (
        <div className="px-3.5 py-2.5">
          <div className="flex flex-col gap-0.5 mb-1.5">
            {section.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                visible={!search || item.text.toLowerCase().includes(search.toLowerCase())}
                onToggle={() => onToggleItem(item.id)}
                onUpdateText={(text) => onUpdateItemText(item.id, text)}
                onDelete={() => onDeleteItem(item.id)}
                onAddTag={(tag) => onAddTag(item.id, tag)}
                onRemoveTag={(tag) => onRemoveTag(item.id, tag)}
                onAddNote={(text) => onAddNote(item.id, text)}
                onDeleteNote={(noteId) => onDeleteNote(item.id, noteId)}
                onOpenTagPicker={(anchorEl) => onOpenTagPicker(anchorEl, item)}
              />
            ))}
          </div>

          {/* Add item row */}
          <div className="flex items-center gap-2 mt-1.5">
            <input
              ref={addInputRef}
              value={addInputVal}
              onChange={(e) => setAddInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitAdd()
                if (e.key === 'Escape') { setAddInputVal(''); setShowAdd(false) }
              }}
              onBlur={() => setTimeout(() => setShowAdd(false), 200)}
              placeholder="New test item…"
              className={`border border-border rounded-lg bg-bg text-[13px] text-text outline-none font-[inherit] transition-[width,padding] duration-200 flex-shrink-0 overflow-hidden hover:border-[#b8ad9e] hover:bg-[#f7f4ee] focus:border-accent focus:bg-white ${showAdd ? 'w-52 px-[11px] py-[7px]' : 'w-0 p-0 border-transparent'}`}
            />
            <button
              className="inline-flex items-center gap-1 px-3 py-[7px] border border-border rounded-lg bg-bg text-[13px] text-text cursor-pointer font-[inherit] hover:bg-surface hover:border-[#b8ad9e] flex-shrink-0 transition-colors"
              onMouseEnter={() => { setShowAdd(true); setTimeout(() => addInputRef.current?.focus(), 50) }}
              onMouseLeave={() => setTimeout(() => { if (document.activeElement !== addInputRef.current) setShowAdd(false) }, 200)}
              onClick={commitAdd}
            >
              <PlusIcon /> Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
pnpm test --run src/components/SectionCard.test.tsx
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/SectionCard.tsx src/components/SectionCard.test.tsx
git commit -m "feat: add SectionCard component"
```

---

## Chunk 4: Assembly

### Task 13: `App.tsx` — wire everything together

**Files:**
- Modify: `src/App.tsx`

This is the composition root. It owns all overlay state, computes stats, and wires `SectionCard` props by partially applying actions with `sectionId`.

- [ ] **Step 1: Write the failing smoke test**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the page header', () => {
    render(<App />)
    expect(screen.getByText('Release Tracker')).toBeInTheDocument()
  })

  it('renders the empty state when no sections', () => {
    render(<App />)
    expect(screen.getByText(/no sections yet/i)).toBeInTheDocument()
  })

  it('renders search input', () => {
    render(<App />)
    expect(screen.getByPlaceholderText(/search tests/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
pnpm test --run src/App.test.tsx
```

Expected: FAIL — App renders boilerplate, not the tracker.

- [ ] **Step 3: Replace `src/App.tsx`**

```tsx
import { useState } from 'react'
import { useTracker } from './hooks/useTracker'
import { StatsBar } from './components/StatsBar'
import { Toolbar } from './components/Toolbar'
import { SectionCard } from './components/SectionCard'
import { ConfirmModal } from './components/ConfirmModal'
import { SuccessModal } from './components/SuccessModal'
import { TagPicker } from './components/TagPicker'
import { ChecklistIcon } from './components/Icons'
import type { Item, TagKey } from './types/tracker'

type ConfirmState = { title: string; body: string; onConfirm: () => void } | null
type SuccessState = { title: string; body: string } | null
type TagPickerState = { item: Item; sectionId: string; anchorEl: HTMLButtonElement } | null

export default function App() {
  const { data, search, setSearch, actions } = useTracker()
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [successState, setSuccessState] = useState<SuccessState>(null)
  const [tagPickerState, setTagPickerState] = useState<TagPickerState>(null)

  // Derived stats
  const allItems = data.sections.flatMap((s) => s.items)
  const passed = allItems.filter((i) => i.checked).length
  const stats = {
    total: allItems.length,
    passed,
    pending: allItems.length - passed,
    sections: data.sections.length,
  }

  // Handle export
  const handleExport = () => {
    const result = actions.exportJSON()
    setSuccessState({
      title: 'Export complete',
      body: `Saved ${result.sections} section(s) and ${result.total} test item(s) to JSON.`,
    })
  }

  // Handle import
  const handleImport = (file: File) => {
    actions.importJSON(file).catch((err: Error) => {
      setConfirmState({
        title: 'Import failed',
        body: err.message,
        onConfirm: () => setConfirmState(null),
      })
    })
  }

  // Resolve live item for TagPicker (avoids stale tag state)
  const liveTagPickerItem = tagPickerState
    ? data.sections
        .find((s) => s.id === tagPickerState.sectionId)
        ?.items.find((i) => i.id === tagPickerState.item.id) ?? null
    : null

  const handleToggleTag = (tag: TagKey) => {
    if (!tagPickerState || !liveTagPickerItem) return
    if (liveTagPickerItem.tags.includes(tag)) {
      actions.removeTag(tagPickerState.sectionId, liveTagPickerItem.id, tag)
    } else {
      actions.addTag(tagPickerState.sectionId, liveTagPickerItem.id, tag)
    }
  }

  return (
    <div className="font-serif bg-bg text-text min-h-screen p-6">
      <div className="max-w-[780px] mx-auto">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-[22px] font-medium text-text flex items-center gap-2">
            <ChecklistIcon /> Release Tracker
          </h1>
          <p className="text-[13px] text-muted mt-0.5">Website testing matrix</p>
        </div>

        <StatsBar {...stats} />

        <Toolbar
          search={search}
          onSearchChange={setSearch}
          onAddSection={actions.addSection}
          onExport={handleExport}
          onImport={handleImport}
        />

        {/* Sections list */}
        {data.sections.length > 0 ? (
          <div className="flex flex-col gap-3">
            {data.sections.map((sec) => (
              <SectionCard
                key={sec.id}
                section={sec}
                search={search}
                onToggle={() => actions.toggleSection(sec.id)}
                onTitleChange={(title) => actions.updateSectionTitle(sec.id, title)}
                onDelete={() =>
                  setConfirmState({
                    title: 'Delete section',
                    body: `Delete "${sec.title}" and all its ${sec.items.length} item(s)? This cannot be undone.`,
                    onConfirm: () => {
                      actions.deleteSection(sec.id)
                      setConfirmState(null)
                    },
                  })
                }
                onAddItem={(text) => actions.addItem(sec.id, text)}
                onDeleteItem={(itemId) => {
                  const item = sec.items.find((i) => i.id === itemId)!
                  setConfirmState({
                    title: 'Delete item',
                    body: `"${item.text}" will be permanently removed.`,
                    onConfirm: () => {
                      actions.deleteItem(sec.id, itemId)
                      setConfirmState(null)
                    },
                  })
                }}
                onToggleItem={(itemId) => actions.toggleItem(sec.id, itemId)}
                onUpdateItemText={(itemId, text) => actions.updateItemText(sec.id, itemId, text)}
                onAddTag={(itemId, tag) => actions.addTag(sec.id, itemId, tag)}
                onRemoveTag={(itemId, tag) => actions.removeTag(sec.id, itemId, tag)}
                onAddNote={(itemId, text) => actions.addNote(sec.id, itemId, text)}
                onDeleteNote={(itemId, noteId) => actions.deleteNote(sec.id, itemId, noteId)}
                onOpenTagPicker={(anchorEl, item) =>
                  setTagPickerState({ item, sectionId: sec.id, anchorEl })
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-muted">
            No sections yet. Click "Add section" to get started.
          </p>
        )}
      </div>

      {/* Portals */}
      {tagPickerState && liveTagPickerItem && (
        <TagPicker
          item={liveTagPickerItem}
          anchorEl={tagPickerState.anchorEl}
          onToggleTag={handleToggleTag}
          onClose={() => setTagPickerState(null)}
        />
      )}

      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          body={confirmState.body}
          onConfirm={confirmState.onConfirm}
          onClose={() => setConfirmState(null)}
          confirmLabel={confirmState.title === 'Import failed' ? 'Close' : 'Delete'}
          hideCancel={confirmState.title === 'Import failed'}
        />
      )}

      {successState && (
        <SuccessModal
          title={successState.title}
          body={successState.body}
          onClose={() => setSuccessState(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run App smoke tests — expect pass**

```bash
pnpm test --run src/App.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Run all tests**

```bash
pnpm test --run
```

Expected: all tests pass (no failures).

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire App.tsx — release tracker fully migrated"
```

---

### Task 14: Cleanup

**Files:**
- Modify: `index.html`
- Modify: `src/main.tsx` (verify no App.css import)
- Delete: `src/App.css` (already done in Task 1, verify)
- Delete: `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png` (boilerplate)

- [ ] **Step 1: Update page title in `index.html`**

Change:
```html
<title>release-tracker</title>
```
To:
```html
<title>Release Tracker</title>
```

- [ ] **Step 2: Remove boilerplate asset imports from `src/App.tsx`** (already replaced in Task 13 — verify no stale imports)

```bash
pnpm build
```

Expected: build succeeds with no TypeScript errors. If there are unused import warnings, remove them.

- [ ] **Step 3: Remove boilerplate asset files**

```bash
rm -f src/assets/react.svg src/assets/vite.svg src/assets/hero.png
```

- [ ] **Step 4: Verify dev server looks correct**

```bash
pnpm dev
```

Open `http://localhost:5173`. You should see:
- "Release Tracker" heading with checklist icon
- Stats bar (0 total, 0 passed, 0 pending, 0 sections, 0% progress)
- Search input and toolbar buttons
- Empty state text "No sections yet. Click 'Add section' to get started."

Manually test:
- Add a section → section card appears, title editable
- Add items → items appear with checkbox
- Check an item → stats bar updates, label gets strikethrough
- Tag an item → tag picker appears, tag badge shows
- Add a note → notes panel opens, comment dot shows
- Delete an item/section → confirm modal appears
- Export JSON → success modal with animated checkmark, file downloaded
- Import the exported file → data reloads correctly

- [ ] **Step 5: Verify localStorage compatibility**

Open browser DevTools → Application → Local Storage. Key should be `release_tracker_v1` with valid JSON matching the original schema (`{ sections: [...] }`).

- [ ] **Step 6: Final commit**

```bash
git add index.html src/main.tsx
git commit -m "chore: cleanup boilerplate, update page title"
```

---

## Summary

All implementation tasks produce working, tested software. The migration is complete when:

- [ ] All `pnpm test --run` tests pass
- [ ] `pnpm build` succeeds with no errors
- [ ] Visual appearance matches `release_tracker.html` (warm beige palette, same layout)
- [ ] LocalStorage key `release_tracker_v1` is preserved (existing data loads)
- [ ] All features work: add/delete sections & items, toggle, tags, notes, export, import, search
