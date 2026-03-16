import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, MessageSquare, ClipboardList, CheckCircle2, Trash2, Plus, Sparkles, Palette, MoreHorizontal, ChevronsDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { Section, Item, TagKey, PriorityKey, Note } from '../types/tracker'
import { SECTION_ICONS, ICON_GROUPS, type SectionIconKey } from './SectionIcons'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { AddItemModal } from './AddItemModal'

function getHeaderColor(hex: string | undefined, isDark: boolean): string {
  if (!hex) return 'var(--kanban-header)'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  if (isDark) {
    return `rgb(${Math.round(r * 0.35)}, ${Math.round(g * 0.35)}, ${Math.round(b * 0.35)})`
  }
  return `rgb(${Math.round(r * 0.85 + 38)}, ${Math.round(g * 0.85 + 38)}, ${Math.round(b * 0.85 + 38)})`
}

const TAG_COLORS: Record<TagKey, string> = {
  bug: '#e05555',
  question: '#d4a020',
  later: '#4a8ae0',
}

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

const SECTION_COLORS = [
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
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Board ────────────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  sections: Section[]
  search: string
  newestSectionId: string | null
  readOnly?: boolean
  filters?: BoardFilters
  onToggleItem: (sectionId: string, itemId: string) => void
  onAddItem: (sectionId: string, text: string, priority?: PriorityKey, tags?: TagKey[]) => void
  onUpdateItemText: (sectionId: string, itemId: string, text: string) => void
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

export function KanbanBoard({
  sections, search, newestSectionId, readOnly, filters,
  onToggleItem, onAddItem, onUpdateItemText, onDeleteItem, onAddNote, onDeleteNote,
  onDeleteSection, onUpdateSectionTitle, onColorChange, onIconChange,
  onReorder, onOpenTagPicker, onAddSection,
}: KanbanBoardProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const isDraggingAny = dragIndex !== null

  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')

  const handleDrop = (toIndex: number) => {
    if (dragIndex !== null && dragIndex !== toIndex) onReorder(dragIndex, toIndex)
    setDragIndex(null)
    setDropIndex(null)
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-6 pt-1 h-full">
      <AnimatePresence initial={false}>
        {sections.map((section, i) => (
          <motion.div
            key={section.id}
            layout
            initial={{ opacity: 0, scale: 0.88, x: -24 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.88, x: -24 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="shrink-0 flex h-full"
          >
            <KanbanColumn
              section={section}
              search={search}
              index={i}
              totalSections={sections.length}
              isNew={section.id === newestSectionId}
              isDragging={dragIndex === i}
              isDropTarget={dropIndex === i && dragIndex !== i}
              isDraggingAny={isDraggingAny}
              isDark={isDark}
              onDragStart={() => setDragIndex(i)}
              onDragOver={() => setDropIndex(i)}
              onDragEnd={() => { setDragIndex(null); setDropIndex(null) }}
              onDrop={() => handleDrop(i)}
              filters={filters}
              onToggleItem={(itemId) => onToggleItem(section.id, itemId)}
              onAddItem={(text, priority, tags) => onAddItem(section.id, text, priority, tags)}
              onUpdateItemText={(itemId, text) => onUpdateItemText(section.id, itemId, text)}
              onDeleteItem={(itemId) => onDeleteItem(section.id, itemId)}
              onAddNote={(itemId, text) => onAddNote(section.id, itemId, text)}
              onDeleteNote={(itemId, noteId) => onDeleteNote(section.id, itemId, noteId)}
              onDeleteSection={() => onDeleteSection(section.id)}
              onUpdateTitle={(title) => onUpdateSectionTitle(section.id, title)}
              onColorChange={(color) => onColorChange(section.id, color)}
              onIconChange={(icon) => onIconChange(section.id, icon)}
              onOpenTagPicker={(anchorEl, item) => onOpenTagPicker(anchorEl, item, section.id)}
              readOnly={readOnly}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add section placeholder */}
      <div
        className={`w-[300px] shrink-0 self-start flex items-center justify-center rounded-[14px] border-2 border-dashed transition-colors cursor-pointer group/add ${
          'border-border/40 hover:border-border hover:bg-muted/30 min-h-[120px]'
        }`}
        onClick={onAddSection}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          if (dragIndex !== null) {
            handleDrop(sections.length)
          }
        }}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground/50 group-hover/add:text-muted-foreground transition-colors">
          <Plus size={20} strokeWidth={1.5} />
          <span className="text-xs font-medium">New section</span>
        </div>
      </div>
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  section: Section
  search: string
  index: number
  totalSections: number
  isNew: boolean
  isDragging: boolean
  isDropTarget: boolean
  isDraggingAny: boolean
  isDark: boolean
  filters?: BoardFilters
  onDragStart: () => void
  onDragOver: () => void
  onDragEnd: () => void
  onDrop: () => void
  onToggleItem: (itemId: string) => void
  onAddItem: (text: string, priority?: PriorityKey, tags?: TagKey[]) => void
  onUpdateItemText: (itemId: string, text: string) => void
  onDeleteItem: (itemId: string) => void
  onAddNote: (itemId: string, text: string) => void
  onDeleteNote: (itemId: string, noteId: string) => void
  onDeleteSection: () => void
  onUpdateTitle: (title: string) => void
  onColorChange: (color: string) => void
  onIconChange: (icon: string) => void
  onOpenTagPicker: (anchorEl: HTMLButtonElement, item: Item) => void
  readOnly?: boolean
}

function KanbanColumn({
  section, search, isNew, isDragging, isDropTarget, isDraggingAny, isDark, filters,
  onDragStart, onDragOver, onDragEnd, onDrop,
  onToggleItem, onAddItem, onUpdateItemText, onDeleteItem, onAddNote, onDeleteNote,
  onDeleteSection, onUpdateTitle, onColorChange, onIconChange,
  onOpenTagPicker, readOnly,
}: KanbanColumnProps) {
  const [addInputVal, setAddInputVal] = useState('')
  const [iconGroup, setIconGroup] = useState(0)
  const [sort, setSort] = useState<ColumnSort>({ field: 'default', direction: 'asc' })
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [hasOverflowBelow, setHasOverflowBelow] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const lastSortedOrder = useRef<string[]>([])

  const checkOverflow = useCallback(() => {
    const el = cardsRef.current
    if (!el) return
    setHasOverflowBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 8)
  }, [])

  const SectionIcon = section.icon ? SECTION_ICONS[section.icon as SectionIconKey] : null
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
  const done = section.items.filter((i) => i.checked).length
  const total = section.items.length
  const allDone = total > 0 && done === total

  useEffect(() => {
    const el = cardsRef.current
    if (!el) return
    checkOverflow()
    const obs = new ResizeObserver(checkOverflow)
    obs.observe(el)
    return () => obs.disconnect()
  }, [checkOverflow, filtered.length])

  useEffect(() => {
    if (isNew && titleRef.current) {
      titleRef.current.focus()
      titleRef.current.select()
    }
  }, [isNew])

  const commitAdd = () => {
    const v = addInputVal.trim()
    if (v) { onAddItem(v); setAddInputVal('') }
  }

  const headerColor = getHeaderColor(section.color, isDark)

  return (
    <div
      draggable={!readOnly}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onDragOver={(e) => { e.preventDefault(); onDragOver() }}
      onDragEnd={onDragEnd}
      onDrop={(e) => { e.preventDefault(); onDrop() }}
      className={`w-[300px] shrink-0 h-full flex flex-col bg-kanban-column rounded-[14px] transition-[box-shadow,opacity,border-color] duration-150 ${
        isDragging ? 'opacity-60 shadow-xl' : 'shadow-sm'
      } ${
        isDropTarget
          ? 'border-2 border-dashed border-emerald-600'
          : isDragging
          ? 'border-2 border-dashed border-border'
          : isDraggingAny
          ? 'border-2 border-dashed border-border/50'
          : 'border-2 border-kanban-border'
      }`}
    >
      {/* Header */}
      <motion.div
        animate={isNew
          ? { backgroundColor: ['#2d4a1e', '#264016', headerColor] }
          : { backgroundColor: headerColor }
        }
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="flex items-center gap-1.5 px-3 py-2.5 rounded-t-[12px] border-b border-border/30 cursor-grab select-none shrink-0"
      >
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

        {/* + Add item button */}
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

        {/* ··· Menu */}
        {!readOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger
              onMouseDown={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center w-6 h-5 rounded text-muted-foreground hover:text-foreground shrink-0 text-[15px] tracking-wider outline-none"
            >
              <MoreHorizontal size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
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
                          {sort.direction === 'asc' ? '\u2191' : '\u2193'}
                        </span>
                      )}
                      {sort.field === opt.field && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Color submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <Palette size={14} />
                  Color
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                    Section color
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                    {SECTION_COLORS.map((c) => {
                      const active = (section.color ?? '') === c.value
                      const bg = isDark ? c.darkBg : c.lightBg
                      return (
                        <button
                          key={c.value || 'default'}
                          title={c.label}
                          onClick={() => onColorChange(c.value)}
                          className="w-7 h-7 rounded-lg transition-transform hover:scale-110"
                          style={{
                            background: bg,
                            border: active ? '2px solid var(--foreground)' : '1px solid var(--border)',
                            boxShadow: active ? '0 0 0 2px var(--ring)' : 'none',
                          }}
                        />
                      )
                    })}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Icon submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  {SectionIcon ? <SectionIcon size={14} /> : <Sparkles size={14} />}
                  Icon
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-[248px] p-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                    Section icon
                  </p>
                  <div className="flex gap-1 mb-2.5">
                    {ICON_GROUPS.map((g, i) => (
                      <Button
                        key={g.label}
                        variant={iconGroup === i ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIconGroup(i)}
                        className="flex-1 h-6 text-[11px] px-1"
                      >
                        {g.label}
                      </Button>
                    ))}
                    <Button
                      variant={!section.icon ? "default" : "outline"}
                      size="sm"
                      onClick={() => onIconChange('')}
                      className="h-6 text-[11px] px-2"
                    >
                      None
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ICON_GROUPS[iconGroup].keys.map((key) => {
                      const IconComp = SECTION_ICONS[key as SectionIconKey]
                      const active = section.icon === key
                      return (
                        <Button
                          key={key}
                          variant="ghost"
                          title={key}
                          onClick={() => onIconChange(key)}
                          className={`w-8 h-8 p-0 ${
                            active
                              ? 'bg-accent text-foreground border border-border'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <IconComp size={15} />
                        </Button>
                      )
                    })}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDeleteSection} className="gap-2 text-red-400 focus:text-red-300">
                <Trash2 size={14} />
                Delete section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </motion.div>

      {/* Cards list */}
      <div
        ref={cardsRef}
        onScroll={checkOverflow}
        className="flex-1 min-h-0 overflow-y-auto p-2 relative"
      >
          <AnimatePresence initial={false}>
            {filtered.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 6 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <KanbanCard
                  item={item}
                  onToggle={() => onToggleItem(item.id)}
                  onUpdateText={(text) => onUpdateItemText(item.id, text)}
                  onDelete={() => onDeleteItem(item.id)}
                  onAddNote={(text) => onAddNote(item.id, text)}
                  onDeleteNote={(noteId) => onDeleteNote(item.id, noteId)}
                  onOpenTagPicker={onOpenTagPicker}
                  readOnly={readOnly}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 px-3 text-muted-foreground">
              <ClipboardList size={28} strokeWidth={1.4} />
              <span className="text-xs">{search ? 'No matches' : 'No items yet'}</span>
              {!search && !readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addInputRef.current?.focus()}
                  className="h-7 text-[11px] border-dashed border-border text-muted-foreground"
                >
                  + Add first item
                </Button>
              )}
            </div>
          )}

        {/* Scroll-to-bottom indicator */}
        <AnimatePresence>
          {hasOverflowBelow && (
            <motion.button
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              onClick={() => cardsRef.current?.scrollTo({ top: cardsRef.current.scrollHeight, behavior: 'smooth' })}
              className="sticky bottom-1 mx-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-foreground/50 text-background text-[10px] font-medium shadow-md backdrop-blur-md hover:bg-foreground/80 transition-colors cursor-pointer z-10"
            >
              <ChevronsDown size={12} />
              More items
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Add item */}
      {!readOnly && (
        <div className="border-t border-border/20 px-3 py-2 rounded-b-[12px] shrink-0">
          <div className="flex items-center gap-1.5">
            <Plus size={12} className="text-muted-foreground/40 shrink-0" />
            <input
              ref={addInputRef}
              value={addInputVal}
              onChange={(e) => setAddInputVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') setAddInputVal('') }}
              placeholder="Add item…"
              className="flex-1 border-none bg-transparent text-xs text-foreground outline-none font-[inherit] py-0.5 placeholder:text-muted-foreground/40"
            />
            {addInputVal.trim() && (
              <Button onClick={commitAdd} size="sm" className="h-6 px-2.5 text-[11px] shrink-0">
                Add
              </Button>
            )}
          </div>
        </div>
      )}

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
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface KanbanCardProps {
  item: Item
  onToggle: () => void
  onUpdateText: (text: string) => void
  onDelete: () => void
  onAddNote: (text: string) => void
  onDeleteNote: (noteId: string) => void
  onOpenTagPicker: (anchorEl: HTMLButtonElement, item: Item) => void
  readOnly?: boolean
}

function KanbanCard({ item, onToggle, onUpdateText, onDelete, onAddNote, onDeleteNote, onOpenTagPicker, readOnly }: KanbanCardProps) {
  const tagBtnRef = useRef<HTMLButtonElement>(null)
  const [showNotes, setShowNotes] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(item.text)
  const editRef = useRef<HTMLTextAreaElement>(null)

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

  return (
    <div className="group/card bg-kanban-card border border-kanban-border rounded-xl px-3 py-2.5 flex flex-col gap-2 shadow-sm hover:bg-kanban-card-hover hover:border-border transition-colors">

      {/* Main row */}
      <div className="flex items-start gap-2.5">
        <Checkbox
          checked={item.checked}
          onCheckedChange={onToggle}
          disabled={readOnly}
          className={`mt-[3px] shrink-0${readOnly ? ' pointer-events-none' : ''}`}
        />
        {editing && !readOnly ? (
          <textarea
            ref={editRef}
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
            } ${
              item.checked ? 'text-muted-foreground/60 line-through' : 'text-foreground'
            }`}
          >
            {item.text}
          </span>
        )}
        {!readOnly && (confirmDelete ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            title="Confirm delete"
            className="h-5 px-1.5 text-[10px] gap-1 shrink-0"
          >
            <Trash2 size={10} /> Delete?
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            title="Delete item"
            className="w-5 h-5 p-0 text-muted-foreground/40 hover:text-red-400 shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity"
          >
            <Trash2 size={12} />
          </Button>
        ))}
      </div>

      {/* Tag pills */}
      {tagCount > 0 && (
        <div className="flex flex-wrap gap-1 pl-7">
          {item.tags.map((tag) => (
            <span
              key={tag}
              style={{ background: TAG_COLORS[tag] + '15', color: TAG_COLORS[tag], borderColor: TAG_COLORS[tag] + '30' }}
              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border"
            >
              <span style={{ background: TAG_COLORS[tag] }} className="w-1.5 h-1.5 rounded-full" />
              {tag}
            </span>
          ))}
        </div>
      )}

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

      {/* Footer actions */}
      {!readOnly && (
        <div className={`flex items-center gap-0.5 pl-6 ${
          (tagCount > 0 || noteCount > 0) ? '' : 'opacity-0 group-hover/card:opacity-100 transition-opacity'
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
      )}

      {/* Comments */}
      <AnimatePresence initial={false}>
        {showNotes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="pl-7 pt-2 border-t border-kanban-border/50">
              {noteCount > 0 && (
                <div className="mb-2.5 space-y-0">
                  {item.notes.map((note: Note, idx) => (
                    <div key={note.id}>
                      {idx > 0 && (
                        <div className="ml-2.5 w-px h-2 bg-border/40" />
                      )}
                      <div className="flex items-start gap-2 group/note">
                        <Avatar className="w-5 h-5 shrink-0 mt-0.5">
                          <AvatarFallback className="text-[8px] bg-muted text-muted-foreground font-mono">
                            U
                          </AvatarFallback>
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
                  <Button onClick={commitNote} size="sm" className="h-7 px-2.5 text-[10px] shrink-0">
                    Save
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
