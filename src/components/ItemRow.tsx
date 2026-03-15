import { useState, useRef } from 'react'
import type { Item, TagKey } from '../types/tracker'
import { TagIcon, MsgIcon, XIcon, BugIcon, QuestionIcon, ClockIcon } from './Icons'

const TAG_CFG = {
  bug:      { label: 'Bug',      style: { background: '#fde8e8', color: '#922222', border: '1px solid #f5c4c4' }, icon: <BugIcon /> },
  question: { label: 'Question', style: { background: '#fef3dc', color: '#7a5000', border: '1px solid #f5dfa0' }, icon: <QuestionIcon /> },
  later:    { label: 'Later',    style: { background: '#e6eef8', color: '#1a4a80', border: '1px solid #b8d0ee' }, icon: <ClockIcon /> },
} as const

const actionBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 26,
  height: 26,
  border: '1px solid transparent',
  borderRadius: 6,
  background: 'transparent',
  cursor: 'pointer',
  color: '#8a7d6e',
  padding: 0,
  flexShrink: 0,
}

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
  onAddTag: _onAddTag,
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
    <div className={!visible ? 'hidden' : ''} style={{ borderRadius: 8 }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: notesOpen ? '8px 8px 0 0' : 8, background: notesOpen ? '#f7f3ec' : 'transparent' }}>
        <input
          type="checkbox"
          checked={item.checked}
          onChange={onToggle}
          style={{ width: 15, height: 15, accentColor: '#7a8c5c', cursor: 'pointer', flexShrink: 0 }}
        />
        <input
          type="text"
          defaultValue={item.text}
          onBlur={(e) => onUpdateText(e.target.value)}
          className={item.checked ? 'line-through' : ''}
          style={{
            flex: 1,
            fontSize: 14,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            color: item.checked ? '#8a7d6e' : '#3a3228',
            fontFamily: 'inherit',
            padding: 0,
            minWidth: 0,
          }}
        />

        {/* Comment dot */}
        {item.notes.length > 0 && (
          <span title="Has comments" style={{ width: 7, height: 7, borderRadius: '50%', background: '#7a8c5c', flexShrink: 0, display: 'inline-block' }} />
        )}

        {/* Tag badges */}
        {item.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {item.tags.map((t) => (
              <span
                key={t}
                title="Click to remove"
                onClick={() => onRemoveTag(t)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, padding: '2px 7px', borderRadius: 99, cursor: 'pointer', flexShrink: 0, ...TAG_CFG[t].style }}
              >
                {TAG_CFG[t].icon} {TAG_CFG[t].label}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          <button
            ref={tagBtnRef}
            title="Add tag"
            style={actionBtn}
            onClick={(e) => { e.stopPropagation(); onOpenTagPicker(tagBtnRef.current!) }}
          >
            <TagIcon />
          </button>
          <button
            title="Comments"
            style={{ ...actionBtn, ...(notesOpen || item.notes.length > 0 ? { color: '#7a8c5c', background: '#e0ead4', borderColor: '#c4d9b0' } : {}) }}
            onClick={() => setNotesOpen((o) => !o)}
          >
            <MsgIcon />
          </button>
          <button
            title="Delete item"
            style={{ ...actionBtn }}
            onClick={onDelete}
          >
            <XIcon />
          </button>
        </div>
      </div>

      {/* Notes panel */}
      {notesOpen && (
        <div style={{ background: '#f7f3ec', borderTop: '1px solid #e8e0d0', padding: '10px 12px', borderRadius: '0 0 8px 8px' }}>
          {/* Existing notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {item.notes.map((n) => (
              <div key={n.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#b0a090', marginTop: 6, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#3a3228', flex: 1, lineHeight: 1.5 }}>{n.text}</span>
                <button
                  style={{ display: 'flex', alignItems: 'center', padding: '2px 4px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#c0a090', borderRadius: 4 }}
                  onClick={() => onDeleteNote(n.id)}
                >
                  <XIcon />
                </button>
              </div>
            ))}
          </div>
          {/* Add note */}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              placeholder="Add a comment…"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitNote() }}
              style={{ flex: 1, padding: '7px 11px', border: '1px solid #ddd5c2', borderRadius: 8, background: '#fff', fontSize: 13, color: '#3a3228', outline: 'none', fontFamily: 'inherit' }}
            />
            <button
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '7px 12px', border: '1px solid #ddd5c2', borderRadius: 8, background: '#faf8f3', fontSize: 12, color: '#3a3228', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
              onClick={commitNote}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
