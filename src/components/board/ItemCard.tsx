import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Tag, MessageSquare, Trash2, ArrowUp, UserPlus } from 'lucide-react'
import type { Item, TagKey, PriorityKey, Note } from '@/types/tracker'
import { TAG_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from './constants'
import { renderTextWithLinks } from './helpers'
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
  onOpenAssigneePicker?: (anchorEl: HTMLElement, item: Item) => void
  readOnly?: boolean
}

export function ItemCard({
  item,
  variant = 'card',
  onToggle,
  onUpdateText,
  onUpdatePriority,
  onDelete,
  onAddNote,
  onDeleteNote,
  onOpenTagPicker,
  onOpenAssigneePicker,
  readOnly,
}: ItemCardProps) {
  const tagBtnRef = useRef<HTMLButtonElement>(null)
  const assigneeBtnRef = useRef<HTMLButtonElement>(null)
  const [showNotes, setShowNotes] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(item.text)
  const editRef = useRef<HTMLTextAreaElement>(null)

  const isUrgent = item.priority === 'urgent'

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
  const assigneeCount = item.assignees.length

  const assigneeDisplay = (
    <div className="flex items-center shrink-0">
      {assigneeCount === 0 && !readOnly && onOpenAssigneePicker ? (
        <button
          ref={assigneeBtnRef}
          onClick={(e) => { e.stopPropagation(); onOpenAssigneePicker(assigneeBtnRef.current!, item) }}
          className="w-5 h-5 rounded-full border border-dashed border-border text-muted-foreground/40 hover:text-muted-foreground hover:border-muted-foreground flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity"
          title="Assign"
        >
          <UserPlus size={10} />
        </button>
      ) : assigneeCount === 1 ? (
        <button
          ref={assigneeBtnRef}
          onClick={(e) => { if (!readOnly && onOpenAssigneePicker) { e.stopPropagation(); onOpenAssigneePicker(assigneeBtnRef.current!, item) } }}
          className="flex items-center gap-1.5 cursor-pointer"
          title={item.assignees[0].name}
        >
          <Avatar className="w-5 h-5 shrink-0">
            <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
              {item.assignees[0].name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] text-muted-foreground">{item.assignees[0].name.split(' ')[0]}</span>
        </button>
      ) : assigneeCount > 1 ? (
        <button
          ref={assigneeBtnRef}
          onClick={(e) => { if (!readOnly && onOpenAssigneePicker) { e.stopPropagation(); onOpenAssigneePicker(assigneeBtnRef.current!, item) } }}
          className="flex items-center cursor-pointer"
          title={item.assignees.map(a => a.name).join(', ')}
        >
          {item.assignees.slice(0, 3).map((a, i) => (
            <Avatar key={a.id} className="w-5 h-5 shrink-0 border-2 border-background" style={{ marginLeft: i > 0 ? -6 : 0 }}>
              <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                {a.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {assigneeCount > 3 && (
            <span className="text-[9px] text-muted-foreground ml-1">+{assigneeCount - 3}</span>
          )}
        </button>
      ) : null}
    </div>
  )

  const formatTs = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  if (variant === 'row') {
    return (
      <div className={`group/card transition-colors ${
        isUrgent
          ? 'border-l-2 border-l-red-500/40 bg-red-500/3 hover:bg-red-500/6'
          : 'hover:bg-muted/40'
      }`}>
        <div className="flex items-center gap-2.5 px-3 py-2">
        <Checkbox
          checked={item.checked}
          onCheckedChange={onToggle}
          disabled={readOnly}
          className={`shrink-0${readOnly ? ' pointer-events-none' : ''}`}
        />

        {/* Text */}
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
            className={`flex-1 text-[13px] leading-relaxed truncate transition-colors ${
              readOnly ? '' : 'cursor-text'
            } ${
              item.checked ? 'text-muted-foreground/60 line-through' : 'text-foreground'
            }`}
          >
            {renderTextWithLinks(item.text)}
          </span>
        )}

        {/* Inline pills */}
        <div className="flex items-center gap-1 shrink-0">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-border text-muted-foreground"
            >
              <span style={{ background: TAG_COLORS[tag] }} className="w-1.5 h-1.5 rounded-full shrink-0" />
              {tag}
            </span>
          ))}
          {item.priority && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                isUrgent
                  ? 'border-red-500/30 bg-red-500/10 text-red-500'
                  : 'border-border text-muted-foreground'
              }`}
            >
              <span
                style={{ background: PRIORITY_COLORS[item.priority] }}
                className="w-1.5 h-1.5 rounded-full shrink-0"
              />
              {PRIORITY_LABELS[item.priority]}
            </span>
          )}
        </div>

        {assigneeDisplay}

        {/* Row actions — always visible */}
        {!readOnly && (
          <div className="flex items-center gap-0.5 shrink-0">
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
                  <DropdownMenuItem
                    key={p}
                    onClick={() => onUpdatePriority(item.priority === p ? null : p)}
                    className="gap-2 text-[12px]"
                  >
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
                className="w-5 h-5 p-0 text-muted-foreground/40 hover:text-red-400 shrink-0"
              >
                <Trash2 size={12} />
              </Button>
            )}
          </div>
        )}

        </div>
        {/* Notes panel for row variant — outside the flex row */}
        <AnimatePresence initial={false}>
          {showNotes && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="pl-9 pt-2 pb-2 border-t border-kanban-border/50">
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

  // variant === 'card'
  return (
    <div className={`group/card border rounded-xl px-3 py-2.5 flex flex-col gap-2 shadow-sm transition-colors ${
      isUrgent
        ? 'bg-red-500/3 border-red-500/20 hover:bg-red-500/6'
        : 'bg-kanban-card border-kanban-border hover:bg-kanban-card-hover hover:border-border'
    }`}>

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
            {renderTextWithLinks(item.text)}
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

      {/* Tag pills — discrete style */}
      {tagCount > 0 && (
        <div className="flex flex-wrap gap-1 pl-7">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-border text-muted-foreground"
            >
              <span style={{ background: TAG_COLORS[tag] }} className="w-1.5 h-1.5 rounded-full shrink-0" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Priority pill — discrete for low/med/high, distinctive for urgent */}
      {item.priority && (
        <div className="pl-7">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
              isUrgent
                ? 'border-red-500/30 bg-red-500/10 text-red-500'
                : 'border-border text-muted-foreground'
            }`}
          >
            <span
              style={{ background: PRIORITY_COLORS[item.priority] }}
              className="w-1.5 h-1.5 rounded-full shrink-0"
            />
            {PRIORITY_LABELS[item.priority]}
          </span>
        </div>
      )}

      {/* Assignees */}
      <div className={`pl-7 ${assigneeCount > 0 ? '' : 'opacity-0 group-hover/card:opacity-100 transition-opacity'}`}>
        {assigneeDisplay}
      </div>

      {/* Footer actions */}
      {!readOnly && (
        <div className={`flex items-center gap-0.5 pl-6 ${
          (tagCount > 0 || noteCount > 0 || item.priority) ? '' : 'opacity-0 group-hover/card:opacity-100 transition-opacity'
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
                <DropdownMenuItem
                  key={p}
                  onClick={() => onUpdatePriority(item.priority === p ? null : p)}
                  className="gap-2 text-[12px]"
                >
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
