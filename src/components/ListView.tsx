import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, Plus } from 'lucide-react'
import type { Section, Item, TagKey, PriorityKey } from '../types/tracker'
import { useBoardLogic } from '@/hooks/use-board-logic'
import { DEFAULT_FILTERS, type BoardFilters } from '@/hooks/use-board-logic'
import { SectionHeader } from '@/components/board/SectionHeader'
import { ItemCard } from '@/components/board/ItemCard'
import { AddItemInput } from '@/components/board/AddItemInput'

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
  onAddNote, onDeleteNote, onDeleteSection, onUpdateSectionTitle,
  onColorChange, onIconChange, onReorder, onOpenTagPicker, onAddSection,
}: ListViewProps) {
  const { sortStates, setSortState, processItems } = useBoardLogic({
    sections,
    search,
    filters: filters ?? DEFAULT_FILTERS,
  })
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')

  const toggleExpand = (sectionId: string) => {
    setCollapsed((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const handleDrop = (toIndex: number) => {
    if (dragIndex !== null && dragIndex !== toIndex) onReorder(dragIndex, toIndex)
    setDragIndex(null)
    setDropIndex(null)
  }

  return (
    <div className="space-y-3 overflow-y-auto h-full pb-6 pt-1">
      <AnimatePresence initial={false}>
        {sections.map((section, i) => {
          const filtered = processItems(section)
          const done = section.items.filter((it) => it.checked).length
          const total = section.items.length
          const expanded = !collapsed[section.id]
          const sort = sortStates[section.id] ?? { field: 'default' as const, direction: 'asc' as const }
          const isDragging = dragIndex === i
          const isDropTarget = dropIndex === i && dragIndex !== i

          return (
            <motion.div
              key={section.id}
              layout
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            >
              <div
                draggable={!readOnly}
                onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragIndex(i) }}
                onDragOver={(e) => { e.preventDefault(); setDropIndex(i) }}
                onDragEnd={() => { setDragIndex(null); setDropIndex(null) }}
                onDrop={(e) => { e.preventDefault(); handleDrop(i) }}
                className={`rounded-[14px] border-2 overflow-hidden transition-[box-shadow,opacity,border-color] duration-150 ${
                  isDragging ? 'opacity-60 shadow-xl' : 'shadow-sm'
                } ${
                  isDropTarget
                    ? 'border-dashed border-emerald-600'
                    : isDragging
                    ? 'border-dashed border-border'
                    : dragIndex !== null
                    ? 'border-dashed border-border/50'
                    : 'border-border/30'
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
                      key="content"
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
                              onOpenTagPicker={(anchorEl, item) => onOpenTagPicker(anchorEl, item, section.id)}
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
                        <AddItemInput onAddItem={(text, p, t) => onAddItem(section.id, text, p, t)} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {!readOnly && (
        <div
          className="flex items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-border/40 hover:border-border hover:bg-muted/30 min-h-[56px] transition-colors cursor-pointer group/add"
          onClick={onAddSection}
        >
          <div className="flex items-center gap-2 text-muted-foreground/50 group-hover/add:text-muted-foreground transition-colors">
            <Plus size={16} strokeWidth={1.5} />
            <span className="text-xs font-medium">New section</span>
          </div>
        </div>
      )}
    </div>
  )
}
