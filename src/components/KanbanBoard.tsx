import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, MessageSquare, ClipboardList, CheckCircle2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import type { Section, Item, TagKey, Note } from '../types/tracker'
import { SECTION_ICONS, type SectionIconKey } from './SectionIcons'
import { SectionColorPicker } from './SectionColorPicker'
import { SectionIconPicker } from './SectionIconPicker'
import { SectionMenu } from './SectionMenu'
import { PlusIcon } from './Icons'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

function darkenColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.round(r * 0.35)}, ${Math.round(g * 0.35)}, ${Math.round(b * 0.35)})`
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

  const handleDrop = (toIndex: number) => {
    if (dragIndex !== null && dragIndex !== toIndex) onReorder(dragIndex, toIndex)
    setDragIndex(null)
    setDropIndex(null)
  }

  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', alignItems: 'flex-start', paddingBottom: 24, paddingTop: 4, height: '100%' }}>
      <AnimatePresence initial={false}>
        {sections.map((section, i) => (
          <motion.div
            key={section.id}
            layout
            initial={{ opacity: 0, scale: 0.88, x: -24 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.88, x: -24 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            style={{ flexShrink: 0 }}
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
  section, search, isNew, isDragging, isDropTarget, isDraggingAny,
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

  const borderStyle = isDropTarget
    ? '2px dashed #7a8c5c'
    : isDragging
    ? '2px dashed rgba(255,255,255,0.15)'
    : isDraggingAny
    ? '2px dashed rgba(255,255,255,0.1)'
    : '2px solid rgba(255,255,255,0.06)'

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onDragOver={(e) => { e.preventDefault(); onDragOver() }}
      onDragEnd={onDragEnd}
      onDrop={(e) => { e.preventDefault(); onDrop() }}
      style={{
        width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: '#1a1a1a', border: borderStyle, borderRadius: 14,
        boxShadow: isDragging ? '0 12px 32px rgba(0,0,0,0.5)' : '0 1px 4px rgba(0,0,0,0.3)',
        opacity: isDragging ? 0.6 : 1,
        transition: 'box-shadow 0.15s, opacity 0.15s, border-color 0.15s',
      }}
    >
      {/* Header */}
      <motion.div
        animate={isNew
          ? { backgroundColor: ['#2d4a1e', '#264016', section.color ? darkenColor(section.color) : '#2a2a2a'] }
          : { backgroundColor: section.color ? darkenColor(section.color) : '#2a2a2a' }
        }
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px',
          borderRadius: '12px 12px 0 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
          cursor: 'grab', userSelect: 'none',
        }}
      >
        {SectionIcon && (
          <span style={{ display: 'flex', alignItems: 'center', color: '#8fa870', flexShrink: 0 }}>
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
          style={{ flex: 1, fontSize: 13, fontWeight: 700, border: 'none', background: 'transparent', outline: 'none', color: '#e5e5e5', fontFamily: 'inherit', cursor: 'text', minWidth: 0, padding: '1px 2px' }}
        />
        {allDone && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#4ade80', fontWeight: 600, flexShrink: 0 }}>
            <CheckCircle2 size={12} /> Done
          </span>
        )}
        <span style={{ fontSize: 11, borderRadius: 99, padding: '1px 7px', flexShrink: 0, whiteSpace: 'nowrap', background: allDone ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.1)', color: allDone ? '#4ade80' : '#e5e5e5' }}>
          {done}/{total}
        </span>
        <button
          ref={menuBtnRef}
          title="Section options"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 22, borderRadius: 6, flexShrink: 0, border: 'none', background: 'transparent', cursor: 'pointer', color: '#888', fontSize: 15, letterSpacing: 1, lineHeight: 1 }}
        >
          ···
        </button>
      </motion.div>

      {/* Reorder + section actions bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            onClick={onMoveLeft}
            disabled={!onMoveLeft}
            title="Move left"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 4, border: 'none', background: 'transparent', cursor: onMoveLeft ? 'pointer' : 'default', color: onMoveLeft ? '#888' : '#333', fontSize: 12 }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={onMoveRight}
            disabled={!onMoveRight}
            title="Move right"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 4, border: 'none', background: 'transparent', cursor: onMoveRight ? 'pointer' : 'default', color: onMoveRight ? '#888' : '#333', fontSize: 12 }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
        {confirmDeleteSection ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: '#f87171' }}>Delete {total} items?</span>
            <button
              onClick={handleDeleteSection}
              style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: '1px solid #dc2626', background: '#dc2626', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDeleteSection(false)}
              style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: '1px solid #444', background: 'transparent', color: '#888', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={handleDeleteSection}
            title="Delete section"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#555' }}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Cards list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        <AnimatePresence initial={false}>
          {filtered.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 6 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 12px', color: '#555' }}>
            <ClipboardList size={28} strokeWidth={1.4} />
            <span style={{ fontSize: 12 }}>{search ? 'No matches' : 'No items yet'}</span>
            {!search && (
              <button
                onClick={() => addInputRef.current?.focus()}
                style={{ fontSize: 11, padding: '4px 12px', border: '1px dashed #444', borderRadius: 8, background: 'transparent', color: '#888', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                + Add first item
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add item */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '8px', borderRadius: '0 0 12px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            ref={addInputRef}
            value={addInputVal}
            onChange={(e) => setAddInputVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') setAddInputVal('') }}
            placeholder="Add item…"
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 12, color: '#e5e5e5', outline: 'none', fontFamily: 'inherit', padding: '2px 0' }}
          />
          {addInputVal.trim() && (
            <button onClick={commitAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', border: '1px solid #7a8c5c', borderRadius: 6, background: '#7a8c5c', fontSize: 11, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              <PlusIcon /> Add
            </button>
          )}
        </div>
      </div>

      {/* Column portals */}
      {menuOpen && menuBtnRef.current && createPortal(
        <SectionMenu ref={menuRef} anchorEl={menuBtnRef.current} sectionColor={section.color} SectionIcon={SectionIcon}
          onColor={() => { setMenuOpen(false); setActivePicker('color') }}
          onIcon={() => { setMenuOpen(false); setActivePicker('icon') }}
          onDelete={() => { setMenuOpen(false); handleDeleteSection() }}
          onClose={() => setMenuOpen(false)}
        />, document.body,
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
    <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 10, padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>

      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
        <Checkbox
          checked={item.checked}
          onCheckedChange={onToggle}
          className="mt-0.5 shrink-0"
        />
        <span style={{ flex: 1, fontSize: 13, color: item.checked ? '#666' : '#e5e5e5', textDecoration: item.checked ? 'line-through' : 'none', lineHeight: 1.4, wordBreak: 'break-word' }}>
          {item.text}
        </span>
        {confirmDelete ? (
          <button
            onClick={handleDelete}
            title="Confirm delete"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '1px 6px', border: '1px solid #dc2626', borderRadius: 4, background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 10, lineHeight: 1, flexShrink: 0, fontFamily: 'inherit' }}
          >
            <Trash2 size={10} /> Delete?
          </button>
        ) : (
          <button
            onClick={handleDelete}
            title="Delete item"
            style={{ display: 'inline-flex', padding: '2px', border: 'none', background: 'transparent', color: '#444', cursor: 'pointer', lineHeight: 1, flexShrink: 0, borderRadius: 4 }}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Tag pills */}
      {tagCount > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 22 }}>
          {item.tags.map((tag) => (
            <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 99, background: TAG_COLORS[tag] + '22', color: TAG_COLORS[tag], border: `1px solid ${TAG_COLORS[tag]}44` }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: TAG_COLORS[tag] }} />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, paddingLeft: 20 }}>
        <button
          ref={tagBtnRef}
          onClick={() => onOpenTagPicker(tagBtnRef.current!, item)}
          title="Tags"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: tagCount > 0 ? '#7a8c5c' : '#555', border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 5px', borderRadius: 6, fontFamily: 'inherit' }}
        >
          <Tag size={13} />
          {tagCount > 0 && <span style={{ fontWeight: 500 }}>{tagCount}</span>}
        </button>
        <button
          onClick={() => setShowNotes((v) => !v)}
          title="Comments"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: noteCount > 0 ? '#4a7aaa' : '#555', border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 5px', borderRadius: 6, fontFamily: 'inherit' }}
        >
          <MessageSquare size={13} />
          {noteCount > 0 && <span style={{ fontWeight: 500 }}>{noteCount}</span>}
        </button>
      </div>

      {/* Comments */}
      <AnimatePresence initial={false}>
        {showNotes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingLeft: 22, paddingTop: 6, borderTop: '1px solid #2a2a2a' }}>
              {noteCount > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {item.notes.map((note: Note, idx) => (
                    <div key={note.id}>
                      {idx > 0 && (
                        <div style={{ marginLeft: 5, width: 1, height: 10, background: '#333' }} />
                      )}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <Avatar className="w-5 h-5 shrink-0 mt-0.5">
                          <AvatarFallback className="text-[8px] bg-neutral-700 text-neutral-300">
                            U
                          </AvatarFallback>
                        </Avatar>
                        <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
                          <p style={{ fontSize: 11, color: '#ccc', lineHeight: 1.45, margin: 0, wordBreak: 'break-word' }}>{note.text}</p>
                          <span style={{ fontSize: 9, color: '#555', marginTop: 2, display: 'block', letterSpacing: '0.01em' }}>{formatTs(note.ts)}</span>
                        </div>
                        <button onClick={() => onDeleteNote(note.id)} title="Delete comment" style={{ border: 'none', background: 'transparent', color: '#444', cursor: 'pointer', fontSize: 14, lineHeight: 1, flexShrink: 0, padding: '2px 0 0' }}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 5, paddingBottom: 4 }}>
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitNote(); if (e.key === 'Escape') setShowNotes(false) }}
                  placeholder="Write a comment…"
                  autoFocus
                  style={{ flex: 1, fontSize: 11, border: '1px solid #333', borderRadius: 6, padding: '4px 7px', outline: 'none', fontFamily: 'inherit', color: '#e5e5e5', background: '#0a0a0a' }}
                />
                {noteText.trim() && (
                  <button onClick={commitNote} style={{ padding: '3px 8px', border: '1px solid #7a8c5c', borderRadius: 6, background: '#7a8c5c', fontSize: 10, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    Save
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
