import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Trash2, Plus, Sparkles, Palette, MoreHorizontal,
  ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, ChevronDown,
} from 'lucide-react'
import type { Section, TagKey, PriorityKey } from '@/types/tracker'
import type { ColumnSort } from '@/hooks/use-board-logic'
import { SECTION_COLORS } from './constants'
import { getHeaderColor } from './helpers'
import { SECTION_ICONS, ICON_KEYS, type SectionIconKey } from '@/components/SectionIcons'
import { Button } from '@/components/ui/button'
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
import { AddItemModal } from '@/components/AddItemModal'

interface SectionHeaderProps {
  section: Section
  done: number
  total: number
  sort: ColumnSort
  isNew: boolean
  isDark: boolean
  readOnly?: boolean
  expanded?: boolean
  onToggleExpand?: () => void
  onSetSort: (sort: ColumnSort) => void
  onUpdateTitle: (title: string) => void
  onColorChange: (color: string) => void
  onIconChange: (icon: string) => void
  onDeleteSection: () => void
  onAddItem?: (text: string, priority?: PriorityKey, tags?: TagKey[]) => void
}

export function SectionHeader({
  section,
  done,
  total,
  sort,
  isNew,
  isDark,
  readOnly,
  expanded,
  onToggleExpand,
  onSetSort,
  onUpdateTitle,
  onColorChange,
  onIconChange,
  onDeleteSection,
  onAddItem,
}: SectionHeaderProps) {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const allDone = total > 0 && done === total
  const SectionIcon = section.icon ? SECTION_ICONS[section.icon as SectionIconKey] : null
  const headerColor = getHeaderColor(section.color, isDark)

  // List view (with expand/collapse) vs kanban (drag handle)
  const isListView = typeof onToggleExpand === 'function'

  return (
    <>
      <motion.div
        animate={isNew
          ? { backgroundColor: ['#2d4a1e', '#264016', headerColor] }
          : { backgroundColor: headerColor }
        }
        transition={{ duration: 1.2, ease: 'easeOut' }}
        onClick={isListView ? onToggleExpand : undefined}
        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-t-[12px] border-b border-border/30 select-none shrink-0 ${
          isListView ? 'cursor-pointer' : 'cursor-grab'
        }`}
      >
        {/* Expand/collapse chevron for list view */}
        {isListView && (
          <span className={`flex items-center text-muted-foreground/60 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-0' : '-rotate-90'}`}>
            <ChevronDown size={14} />
          </span>
        )}

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
        {!readOnly && onAddItem && (
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
              onClick={(e) => e.stopPropagation()}
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
                          onSetSort({ field: opt.field, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
                        } else {
                          onSetSort({ field: opt.field, direction: 'asc' })
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
                  <div className="flex justify-end mb-2.5">
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
                    {ICON_KEYS.map((key) => {
                      const IconComp = SECTION_ICONS[key]
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

      {addModalOpen && onAddItem && (
        <AddItemModal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onSubmit={({ text, priority, tags }) => {
            onAddItem(text, priority, tags)
            setAddModalOpen(false)
          }}
        />
      )}
    </>
  )
}

