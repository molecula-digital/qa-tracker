import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, ChevronsDown, Plus } from 'lucide-react'
import type { Section, Item, TagKey, PriorityKey } from '../types/tracker'
import { Button } from '@/components/ui/button'
import { useBoardLogic } from '@/hooks/use-board-logic'
import { SectionHeader } from '@/components/board/SectionHeader'
import { ItemCard } from '@/components/board/ItemCard'
import { AddItemInput } from '@/components/board/AddItemInput'

// Re-exports for backward compat (page.tsx imports these from here)
export { type BoardFilters, DEFAULT_FILTERS, type ColumnSort } from '@/hooks/use-board-logic'
import { DEFAULT_FILTERS, type BoardFilters } from '@/hooks/use-board-logic'

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
  onOpenAssigneePicker: (anchorEl: HTMLElement, item: Item, sectionId: string) => void
  onAddSection?: () => void
}

export function KanbanBoard({
  sections, search, newestSectionId, readOnly, filters,
  onToggleItem, onAddItem, onUpdateItemText, onUpdateItemPriority, onDeleteItem, onAddNote, onDeleteNote,
  onDeleteSection, onUpdateSectionTitle, onColorChange, onIconChange,
  onReorder, onOpenTagPicker, onOpenAssigneePicker, onAddSection,
}: KanbanBoardProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const isDraggingAny = dragIndex !== null

  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')

  const { sortStates, setSortState, processItems } = useBoardLogic({
    sections,
    search,
    filters: filters ?? DEFAULT_FILTERS,
  })

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
              filteredItems={processItems(section)}
              sort={sortStates[section.id] ?? { field: 'default', direction: 'asc' }}
              isNew={section.id === newestSectionId}
              isDragging={dragIndex === i}
              isDropTarget={dropIndex === i && dragIndex !== i}
              isDraggingAny={isDraggingAny}
              isDark={isDark}
              onDragStart={() => setDragIndex(i)}
              onDragOver={() => setDropIndex(i)}
              onDragEnd={() => { setDragIndex(null); setDropIndex(null) }}
              onDrop={() => handleDrop(i)}
              onSetSort={(sort) => setSortState(section.id, sort)}
              onToggleItem={(itemId) => onToggleItem(section.id, itemId)}
              onAddItem={(text, priority, tags) => onAddItem(section.id, text, priority, tags)}
              onUpdateItemText={(itemId, text) => onUpdateItemText(section.id, itemId, text)}
              onUpdateItemPriority={(itemId, priority) => onUpdateItemPriority(section.id, itemId, priority)}
              onDeleteItem={(itemId) => onDeleteItem(section.id, itemId)}
              onAddNote={(itemId, text) => onAddNote(section.id, itemId, text)}
              onDeleteNote={(itemId, noteId) => onDeleteNote(section.id, itemId, noteId)}
              onDeleteSection={() => onDeleteSection(section.id)}
              onUpdateTitle={(title) => onUpdateSectionTitle(section.id, title)}
              onColorChange={(color) => onColorChange(section.id, color)}
              onIconChange={(icon) => onIconChange(section.id, icon)}
              onOpenTagPicker={(anchorEl, item) => onOpenTagPicker(anchorEl, item, section.id)}
              onOpenAssigneePicker={(anchorEl, item) => onOpenAssigneePicker(anchorEl, item, section.id)}
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
  filteredItems: Item[]
  sort: { field: 'default' | 'priority' | 'date' | 'checked' | 'alpha'; direction: 'asc' | 'desc' }
  isNew: boolean
  isDragging: boolean
  isDropTarget: boolean
  isDraggingAny: boolean
  isDark: boolean
  onDragStart: () => void
  onDragOver: () => void
  onDragEnd: () => void
  onDrop: () => void
  onSetSort: (sort: { field: 'default' | 'priority' | 'date' | 'checked' | 'alpha'; direction: 'asc' | 'desc' }) => void
  onToggleItem: (itemId: string) => void
  onAddItem: (text: string, priority?: PriorityKey, tags?: TagKey[]) => void
  onUpdateItemText: (itemId: string, text: string) => void
  onUpdateItemPriority: (itemId: string, priority: PriorityKey | null) => void
  onDeleteItem: (itemId: string) => void
  onAddNote: (itemId: string, text: string) => void
  onDeleteNote: (itemId: string, noteId: string) => void
  onDeleteSection: () => void
  onUpdateTitle: (title: string) => void
  onColorChange: (color: string) => void
  onIconChange: (icon: string) => void
  onOpenTagPicker: (anchorEl: HTMLButtonElement, item: Item) => void
  onOpenAssigneePicker: (anchorEl: HTMLElement, item: Item) => void
  readOnly?: boolean
}

function KanbanColumn({
  section, search, filteredItems, sort, isNew, isDragging, isDropTarget, isDraggingAny, isDark,
  onDragStart, onDragOver, onDragEnd, onDrop, onSetSort,
  onToggleItem, onAddItem, onUpdateItemText, onUpdateItemPriority, onDeleteItem, onAddNote, onDeleteNote,
  onDeleteSection, onUpdateTitle, onColorChange, onIconChange,
  onOpenTagPicker, onOpenAssigneePicker, readOnly,
}: KanbanColumnProps) {
  const [hasOverflowBelow, setHasOverflowBelow] = useState(false)
  const cardsRef = useRef<HTMLDivElement>(null)

  const checkOverflow = useCallback(() => {
    const el = cardsRef.current
    if (!el) return
    setHasOverflowBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 8)
  }, [])

  const done = section.items.filter((i) => i.checked).length
  const total = section.items.length

  useEffect(() => {
    const el = cardsRef.current
    if (!el) return
    checkOverflow()
    const obs = new ResizeObserver(checkOverflow)
    obs.observe(el)
    return () => obs.disconnect()
  }, [checkOverflow, filteredItems.length])

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
      <SectionHeader
        section={section}
        done={done}
        total={total}
        sort={sort}
        isNew={isNew}
        isDark={isDark}
        readOnly={readOnly}
        onSetSort={onSetSort}
        onUpdateTitle={onUpdateTitle}
        onColorChange={onColorChange}
        onIconChange={onIconChange}
        onDeleteSection={onDeleteSection}
        onAddItem={onAddItem}
      />

      {/* Cards list */}
      <div
        ref={cardsRef}
        onScroll={checkOverflow}
        className="flex-1 min-h-0 overflow-y-auto p-2 relative"
      >
        <AnimatePresence initial={false}>
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 6 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <ItemCard
                item={item}
                variant="card"
                onToggle={() => onToggleItem(item.id)}
                onUpdateText={(text) => onUpdateItemText(item.id, text)}
                onUpdatePriority={(priority) => onUpdateItemPriority(item.id, priority)}
                onDelete={() => onDeleteItem(item.id)}
                onAddNote={(text) => onAddNote(item.id, text)}
                onDeleteNote={(noteId) => onDeleteNote(item.id, noteId)}
                onOpenTagPicker={onOpenTagPicker}
                onOpenAssigneePicker={onOpenAssigneePicker}
                readOnly={readOnly}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 px-3 text-muted-foreground">
            <ClipboardList size={28} strokeWidth={1.4} />
            <span className="text-xs">{search ? 'No matches' : 'No items yet'}</span>
            {!search && !readOnly && (
              <Button
                variant="outline"
                size="sm"
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

      {!readOnly && <AddItemInput onAddItem={onAddItem} />}
    </div>
  )
}
