import { forwardRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Palette, Sparkles, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SectionMenuProps {
  anchorEl: HTMLElement
  sectionColor: string | undefined
  SectionIcon: LucideIcon | null
  onColor: () => void
  onIcon: () => void
  onDelete: () => void
  onClose: () => void
}

export const SectionMenu = forwardRef<HTMLDivElement, SectionMenuProps>(function SectionMenu(
  { sectionColor, SectionIcon, onColor, onIcon, onDelete, onClose },
  _ref,
) {
  return (
    <DropdownMenu open onOpenChange={(open) => { if (!open) onClose() }}>
      <DropdownMenuTrigger className="sr-only">Menu</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onColor} className="gap-2">
          <span
            className="w-3.5 h-3.5 rounded shrink-0 border border-border"
            style={{ background: sectionColor || 'var(--kanban-header)' }}
          />
          Color
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onIcon} className="gap-2">
          {SectionIcon
            ? <SectionIcon size={14} />
            : <Sparkles size={14} />
          }
          Icon
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="gap-2 text-red-400 focus:text-red-300">
          <Trash2 size={14} />
          Delete section
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
