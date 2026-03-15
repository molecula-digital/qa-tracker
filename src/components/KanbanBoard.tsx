import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, MessageSquare, ClipboardList, CheckCircle2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import type { Section, Item, TagKey, Note } from '../types/tracker'
import { SECTION_ICONS, type SectionIconKey } from './SectionIcons'
import { SectionColorPicker } from './SectionColorPicker'
import { SectionIconPicker } from './SectionIconPicker'
import { SectionMenu } from './SectionMenu'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

function darkenColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.round(r * 0.35)}, ${Math.round(g * 0.35)}, ${Math.round(b * 0.35)})`
}

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

// ─── Board ────────────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  sections: Section[]
  search: string
  newestSectionId: string | null
  onToggleItem: (sectionId: string, itemId: string) => void
  onAddItem: (sectionId: string, text: string) => void
  onDeleteItem: (sectionId: string, itemId: string) => void
  onAddNote: (sectionId: string, itemId: string, text: string) => void
  onDeleteNote: (sectionId: string, itemId: string, noteId: string) => void
  onDeleteSection: (sectionId: string) => void
  onUpdateSectionTitle: (sectionId: string, title: string) => void
  onColorChange: (sectionId: string, color: string) => void
  onIconChange: (sectionId: string, icon: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onOpenTagPicker: (anchorEl: HTMLButtonElement, item: Item, sectionId: string) => void
}

export function KanbanBoard({
  sections, search, newestSectionId,
  onToggleItem, onAddItem, onDeleteItem, onAddNote, onDeleteNote,
  onDeleteSection, onUpdateSectionTitle, onColorChange, onIconChange,
  onReorder, onOpenTagPicker,
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
    <div className="flex gap-3 overflow-x-auto items-start pb-6 pt-1 h-full">
      <AnimatePresence initial={false}>
        {sections.map((section, i) => (
          <motion.div
            key={section.id}
            layout
            initial={{ opacity: 0, scale: 0.88, x: -24 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.88, x: -24 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="shrink-0"
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
              onToggleItem={(itemId) => onToggleItem(section.id, itemId)}
              onAddItem={(text) => onAddItem(section.id, text)}
              onDeleteItem={(itemId) => onDeleteItem(section.id, itemId)}
              onAddNote={(itemId, text) => onAddNote(section.id, itemId, text)}
              onDeleteNote={(itemId, noteId) => onDeleteNote(section.id, itemId, noteId)}
              onDeleteSection={() => onDeleteSection(section.id)}
              onUpdateTitle={(title) => onUpdateSectionTitle(section.id, title)}
              onColorChange={(color) => onColorChange(section.id, color)}
              onIconChange={(icon) => onIconChange(section.id, icon)}
              onMoveLeft={i > 0 ? () => onReorder(i, i - 1) : undefined}
              onMoveRight={i < sections.length - 1 ? () => onReorder(i, i + 1) : undefined}
              onOpenTagPicker={(anchorEl, item) => onOpenTagPicker(anchorEl, item, section.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
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
  onDragStart: () => void
  onDragOver: () => void
  onDragEnd: () => void
  onDrop: () => void
  onToggleItem: (itemId: string) => void
  onAddItem: (text: string) => void
  onDeleteItem: (itemId: string) => void
  onAddNote: (itemId: string, text: string) => void
  onDeleteNote: (itemId: string, noteId: string) => void
  onDeleteSection: () => void
  onUpdateTitle: (title: string) => void
  onColorChange: (color: string) => void
  onIconChange: (icon: string) => void
  onMoveLeft?: () => void
  onMoveRight?: () => void
  onOpenTagPicker: (anchorEl: HTMLButtonElement, item: Item) => void
}

function KanbanColumn({
  section, search, isNew, isDragging, isDropTarget, isDraggingAny, isDark,
  onDragStart, onDragOver, onDragEnd, onDrop,
  onToggleItem, onAddItem, onDeleteItem, onAddNote, onDeleteNote,
  onDeleteSection, onUpdateTitle, onColorChange, onIconChange,
  onMoveLeft, onMoveRight, onOpenTagPicker,
}: KanbanColumnProps) {
  const [addInputVal, setAddInputVal] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [activePicker, setActivePicker] = useState<'color' | 'icon' | null>(null)
  const [confirmDeleteSection, setConfirmDeleteSection] = useState(false)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)
  const lastSortedOrder = useRef<string[]>([])

  const SectionIcon = section.icon ? SECTION_ICONS[section.icon as SectionIconKey] : null
  const filtered = (() => {
    const items = section.items.filter(
      (i) => !search || i.text.toLowerCase().includes(search.toLowerCase()),
    )
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
    if (isNew && titleRef.current) {
      titleRef.current.focus()
      titleRef.current.select()
    }
  }, [isNew])

  const commitAdd = () => {
    const v = addInputVal.trim()
    if (v) { onAddItem(v); setAddInputVal('') }
  }

  const handleDeleteSection = () => {
    if (total > 0 && !confirmDeleteSection) {
      setConfirmDeleteSection(true)
      return
    }
    onDeleteSection()
    setConfirmDeleteSection(false)
  }

  const headerColor = getHeaderColor(section.color, isDark)

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onDragOver={(e) => { e.preventDefault(); onDragOver() }}
      onDragEnd={onDragEnd}
      onDrop={(e) => { e.preventDefault(); onDrop() }}
      className={`w-[300px] shrink-0 flex flex-col bg-kanban-column rounded-[14px] transition-[box-shadow,opacity,border-color] duration-150 ${
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
        className="flex items-center gap-1.5 px-3 py-2.5 rounded-t-[12px] border-b border-border/30 cursor-grab select-none"
      >
        {SectionIcon && (
          <span className="flex items-center text-emerald-600 dark:text-emerald-400/70 shrink-0">
            <SectionIcon size={14} />
          </span>
        )}
        <input
          ref={titleRef}
          type="text"
          defaultValue={section.title}
          onBlur={(e) => onUpdateTitle(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex-1 text-[13px] font-bold border-none bg-transparent outline-none text-foreground font-[inherit] cursor-text min-w-0 px-0.5 py-px"
        />
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
        <Button
          ref={menuBtnRef}
          variant="ghost"
          size="sm"
          title="Section options"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
          className="w-6 h-5 p-0 text-muted-foreground hover:text-foreground shrink-0 text-[15px] tracking-wider"
        >
          ···
        </Button>
      </motion.div>

      {/* Reorder + section actions bar */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border/20">
        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveLeft}
            disabled={!onMoveLeft}
            title="Move left"
            className="w-6 h-6 p-0 text-muted-foreground hover:text-foreground disabled:text-muted-foreground/30 disabled:opacity-100"
          >
            <ChevronLeft size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveRight}
            disabled={!onMoveRight}
            title="Move right"
            className="w-6 h-6 p-0 text-muted-foreground hover:text-foreground disabled:text-muted-foreground/30 disabled:opacity-100"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
        {confirmDeleteSection ? (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-red-400">Delete {total} items?</span>
            <Button variant="destructive" size="sm" onClick={handleDeleteSection} className="h-5 px-2 text-[10px]">
              Yes
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmDeleteSection(false)} className="h-5 px-2 text-[10px]">
              No
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteSection}
            title="Delete section"
            className="w-6 h-6 p-0 text-muted-foreground hover:text-red-400"
          >
            <Trash2 size={12} />
          </Button>
        )}
      </div>

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0">
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
                onDelete={() => onDeleteItem(item.id)}
                onAddNote={(text) => onAddNote(item.id, text)}
                onDeleteNote={(noteId) => onDeleteNote(item.id, noteId)}
                onOpenTagPicker={onOpenTagPicker}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 px-3 text-muted-foreground">
            <ClipboardList size={28} strokeWidth={1.4} />
            <span className="text-xs">{search ? 'No matches' : 'No items yet'}</span>
            {!search && (
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
      </div>

      {/* Add item */}
      <div className="border-t border-border/30 p-2 rounded-b-[12px]">
        <div className="flex items-center gap-1.5">
          <input
            ref={addInputRef}
            value={addInputVal}
            onChange={(e) => setAddInputVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') setAddInputVal('') }}
            placeholder="Add item…"
            className="flex-1 border-none bg-transparent text-xs text-foreground outline-none font-[inherit] py-0.5"
          />
          {addInputVal.trim() && (
            <Button onClick={commitAdd} size="sm" className="h-6 px-2 text-[11px] gap-1 bg-emerald-700 hover:bg-emerald-600 text-white shrink-0">
              Add
            </Button>
          )}
        </div>
      </div>

      {/* Column menus */}
      {menuOpen && (
        <SectionMenu ref={menuRef} anchorEl={menuBtnRef.current!} sectionColor={section.color} SectionIcon={SectionIcon}
          onColor={() => { setMenuOpen(false); setActivePicker('color') }}
          onIcon={() => { setMenuOpen(false); setActivePicker('icon') }}
          onDelete={() => { setMenuOpen(false); handleDeleteSection() }}
          onClose={() => setMenuOpen(false)}
        />
      )}
      {activePicker === 'color' && menuBtnRef.current && (
        <SectionColorPicker currentColor={section.color} anchorEl={menuBtnRef.current} onSelect={onColorChange} onClose={() => setActivePicker(null)} />
      )}
      {activePicker === 'icon' && menuBtnRef.current && (
        <SectionIconPicker currentIcon={section.icon} anchorEl={menuBtnRef.current} onSelect={onIconChange} onClose={() => setActivePicker(null)} />
      )}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface KanbanCardProps {
  item: Item
  onToggle: () => void
  onDelete: () => void
  onAddNote: (text: string) => void
  onDeleteNote: (noteId: string) => void
  onOpenTagPicker: (anchorEl: HTMLButtonElement, item: Item) => void
}

function KanbanCard({ item, onToggle, onDelete, onAddNote, onDeleteNote, onOpenTagPicker }: KanbanCardProps) {
  const tagBtnRef = useRef<HTMLButtonElement>(null)
  const [showNotes, setShowNotes] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const commitNote = () => {
    const v = noteText.trim()
    if (v) { onAddNote(v); setNoteText('') }
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000) // auto-cancel after 3s
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
    <div className="bg-kanban-card border border-kanban-border rounded-[10px] px-[11px] py-[9px] flex flex-col gap-1.5 shadow-sm">

      {/* Main row */}
      <div className="flex items-start gap-[7px]">
        <Checkbox
          checked={item.checked}
          onCheckedChange={onToggle}
          className="mt-0.5 shrink-0"
        />
        <span className={`flex-1 text-[13px] leading-[1.4] break-words ${
          item.checked ? 'text-muted-foreground line-through' : 'text-foreground'
        }`}>
          {item.text}
        </span>
        {confirmDelete ? (
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
            className="w-5 h-5 p-0 text-muted-foreground hover:text-red-400 shrink-0"
          >
            <Trash2 size={12} />
          </Button>
        )}
      </div>

      {/* Tag pills */}
      {tagCount > 0 && (
        <div className="flex flex-wrap gap-1 pl-[22px]">
          {item.tags.map((tag) => (
            <span key={tag} style={{ background: TAG_COLORS[tag] + '22', color: TAG_COLORS[tag], borderColor: TAG_COLORS[tag] + '44' }} className="inline-flex items-center gap-[3px] text-[10px] font-medium px-1.5 py-px rounded-full border">
              <span style={{ background: TAG_COLORS[tag] }} className="w-[5px] h-[5px] rounded-full" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-0.5 pl-5">
        <Button
          ref={tagBtnRef}
          variant="ghost"
          size="sm"
          onClick={() => onOpenTagPicker(tagBtnRef.current!, item)}
          title="Tags"
          className={`h-6 px-1.5 text-[10px] gap-1 ${tagCount > 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}
        >
          <Tag size={13} />
          {tagCount > 0 && <span className="font-medium">{tagCount}</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNotes((v) => !v)}
          title="Comments"
          className={`h-6 px-1.5 text-[10px] gap-1 ${noteCount > 0 ? 'text-blue-400' : 'text-muted-foreground'}`}
        >
          <MessageSquare size={13} />
          {noteCount > 0 && <span className="font-medium">{noteCount}</span>}
        </Button>
      </div>

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
            <div className="pl-[22px] pt-1.5 border-t border-kanban-border">
              {noteCount > 0 && (
                <div className="mb-2">
                  {item.notes.map((note: Note, idx) => (
                    <div key={note.id}>
                      {idx > 0 && (
                        <div className="ml-[5px] w-px h-[10px] bg-kanban-border" />
                      )}
                      <div className="flex items-start gap-2">
                        <Avatar className="w-5 h-5 shrink-0 mt-0.5">
                          <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                            U
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 pb-0.5">
                          <p className="text-[11px] text-foreground/80 leading-[1.45] m-0 break-words">{note.text}</p>
                          <span className="text-[9px] text-muted-foreground mt-0.5 block tracking-[0.01em]">{formatTs(note.ts)}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => onDeleteNote(note.id)} title="Delete comment" className="w-5 h-5 p-0 text-muted-foreground hover:text-red-400 shrink-0">&times;</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-[5px] pb-1">
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitNote(); if (e.key === 'Escape') setShowNotes(false) }}
                  placeholder="Write a comment…"
                  autoFocus
                  className="flex-1 text-[11px] border border-kanban-border rounded-md px-[7px] py-1 outline-none font-[inherit] text-foreground bg-kanban-input-bg"
                />
                {noteText.trim() && (
                  <Button onClick={commitNote} size="sm" className="h-6 px-2 text-[10px] bg-emerald-700 hover:bg-emerald-600 text-white shrink-0">
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
