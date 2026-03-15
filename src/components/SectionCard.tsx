import { useState, useRef, useEffect, forwardRef } from 'react'
import { createPortal } from 'react-dom'
import type { Section, Item, TagKey } from '../types/tracker'
import { ItemRow } from './ItemRow'
import { ChevronIcon, TrashIcon, PlusIcon } from './Icons'
import { SECTION_ICONS, type SectionIconKey } from './SectionIcons'
import { SectionColorPicker } from './SectionColorPicker'
import { SectionIconPicker } from './SectionIconPicker'
import type { LucideIcon } from 'lucide-react'

interface SectionMenuProps {
  anchorEl: HTMLElement
  sectionColor: string | undefined
  SectionIcon: LucideIcon | null
  onColor: () => void
  onIcon: () => void
  onDelete: () => void
  onClose: () => void
}

const SectionMenu = forwardRef<HTMLDivElement, SectionMenuProps>(function SectionMenu(
  { anchorEl, sectionColor, SectionIcon, onColor, onIcon, onDelete, onClose },
  ref,
) {
  const rect = anchorEl.getBoundingClientRect()
  const top = rect.bottom + window.scrollY + 4
  const right = window.innerWidth - rect.right - window.scrollX

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = (ref as React.RefObject<HTMLDivElement>).current
      if (el && !el.contains(e.target as Node) && e.target !== anchorEl) onClose()
    }
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [anchorEl, onClose, ref])

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '8px 14px', border: 'none', background: 'transparent',
    fontSize: 13, color: '#3a3228', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top, right, zIndex: 9999,
        background: '#fff', border: '1px solid #ddd5c2', borderRadius: 10,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 156,
        padding: '4px 0', overflow: 'hidden',
      }}
    >
      <button style={itemStyle} onClick={onColor}>
        <span style={{ width: 14, height: 14, borderRadius: 4, background: sectionColor || '#f2ede3', border: '1px solid #bbb5aa', flexShrink: 0, display: 'inline-block' }} />
        Color
      </button>
      <button style={itemStyle} onClick={onIcon}>
        {SectionIcon
          ? <SectionIcon size={14} />
          : <span style={{ fontSize: 14, width: 14, textAlign: 'center' }}>✦</span>
        }
        Icon
      </button>
      <div style={{ height: 1, background: '#f0ebe0', margin: '4px 0' }} />
      <button style={{ ...itemStyle, color: '#a33333' }} onClick={onDelete}>
        <TrashIcon />
        Delete section
      </button>
    </div>
  )
})

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
  onColorChange: (color: string) => void
  onIconChange: (icon: string) => void
}

type ActivePicker = 'color' | 'icon' | null

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
  onColorChange,
  onIconChange,
}: SectionCardProps) {
  const [addInputVal, setAddInputVal] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activePicker, setActivePicker] = useState<ActivePicker>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const done = section.items.filter((i) => i.checked).length
  const total = section.items.length
  const pct = total ? Math.round((done / total) * 100) : 0

  const commitAdd = () => {
    const v = addInputVal.trim()
    if (v) { onAddItem(v); setAddInputVal('') }
  }

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          menuBtnRef.current && !menuBtnRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const headerBg = section.color || '#f2ede3'
  const SectionIcon = section.icon ? SECTION_ICONS[section.icon as SectionIconKey] : null

  return (
    <div style={{ background: '#fff', border: '1px solid #ddd5c2', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <div
        className="cursor-pointer select-none"
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: headerBg, borderBottom: '1px solid #ddd5c2', cursor: 'pointer', userSelect: 'none' }}
        onClick={onToggle}
      >
        <span style={{ display: 'flex', alignItems: 'center', color: '#8a7d6e', flexShrink: 0, transition: 'transform 0.2s', transform: section.open ? 'rotate(90deg)' : 'none' }}>
          <ChevronIcon />
        </span>

        {SectionIcon && (
          <span style={{ display: 'flex', alignItems: 'center', color: '#5a6b48', flexShrink: 0 }}>
            <SectionIcon size={15} />
          </span>
        )}

        <span className="sr-only">{section.title}</span>
        <input
          type="text"
          defaultValue={section.title}
          onBlur={(e) => onTitleChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{ flex: 1, fontSize: 15, fontWeight: 500, border: 'none', background: 'transparent', outline: 'none', color: '#3a3228', fontFamily: 'inherit', cursor: 'text', minWidth: 0, padding: '2px 4px', borderRadius: 4 }}
        />

        {total > 1 && (
          <div style={{ width: 72, height: 6, background: '#e8e0d0', borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#7a8c5c', borderRadius: 99, transition: 'width 0.3s' }} />
          </div>
        )}

        <span style={{ fontSize: 12, color: '#8a7d6e', background: '#e8e0d0', borderRadius: 99, padding: '2px 10px', flexShrink: 0 }}>
          {done}/{total}
        </span>

        {/* 3-dot menu button */}
        <button
          ref={menuBtnRef}
          title="Section options"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            border: '1px solid transparent', background: 'transparent',
            cursor: 'pointer', color: '#8a7d6e', fontSize: 16, letterSpacing: 1,
            lineHeight: 1,
          }}
        >
          ···
        </button>
      </div>

      {/* Body */}
      {section.open && (
        <div style={{ padding: '10px 14px 14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, borderTop: '1px solid #f0ebe0', paddingTop: 8 }}>
            <input
              ref={addInputRef}
              value={addInputVal}
              onChange={(e) => setAddInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitAdd()
                if (e.key === 'Escape') setAddInputVal('')
              }}
              placeholder="Add a test item…"
              style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, color: '#3a3228', outline: 'none', fontFamily: 'inherit', padding: '4px 2px' }}
            />
            {addInputVal.trim() && (
              <button
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid #7a8c5c', borderRadius: 8, background: '#7a8c5c', fontSize: 12, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                onClick={commitAdd}
              >
                <PlusIcon /> Add
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3-dot dropdown menu (portal) */}
      {menuOpen && menuBtnRef.current && createPortal(
        <SectionMenu
          ref={menuRef}
          anchorEl={menuBtnRef.current}
          sectionColor={section.color}
          SectionIcon={SectionIcon}
          onColor={() => { setMenuOpen(false); setActivePicker('color') }}
          onIcon={() => { setMenuOpen(false); setActivePicker('icon') }}
          onDelete={() => { setMenuOpen(false); onDelete() }}
          onClose={() => setMenuOpen(false)}
        />,
        document.body,
      )}

      {/* Pickers (portals) */}
      {activePicker === 'color' && menuBtnRef.current && (
        <SectionColorPicker
          currentColor={section.color}
          anchorEl={menuBtnRef.current}
          onSelect={onColorChange}
          onClose={() => setActivePicker(null)}
        />
      )}
      {activePicker === 'icon' && menuBtnRef.current && (
        <SectionIconPicker
          currentIcon={section.icon}
          anchorEl={menuBtnRef.current}
          onSelect={onIconChange}
          onClose={() => setActivePicker(null)}
        />
      )}
    </div>
  )
}
