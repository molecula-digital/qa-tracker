import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { SECTION_ICONS, ICON_KEYS, type SectionIconKey } from './SectionIcons'
import { Button } from '@/components/ui/button'

interface SectionIconPickerProps {
  currentIcon: string | undefined
  anchorEl: HTMLElement
  onSelect: (icon: string) => void
  onClose: () => void
}

export function SectionIconPicker({ currentIcon, anchorEl, onSelect, onClose }: SectionIconPickerProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  const rect = anchorEl.getBoundingClientRect()
  const top = rect.bottom + window.scrollY + 6
  const rawLeft = rect.left + window.scrollX
  const maxLeft = window.innerWidth - 270
  const left = Math.min(rawLeft, maxLeft)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) && e.target !== anchorEl) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [anchorEl, onClose])

  return createPortal(
    <div
      ref={popoverRef}
      className="absolute z-[9999] w-[248px] rounded-xl border border-border bg-popover p-3 shadow-xl"
      style={{ top, left }}
    >
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
        Section icon
      </p>

      <div className="flex justify-end mb-2.5">
        <Button
          variant={!currentIcon ? "default" : "outline"}
          size="sm"
          onClick={() => { onSelect(''); onClose() }}
          className="h-6 text-[11px] px-2"
        >
          None
        </Button>
      </div>

      {/* Icon grid */}
      <div className="flex flex-wrap gap-1">
        {ICON_KEYS.map((key) => {
          const IconComp = SECTION_ICONS[key]
          const active = currentIcon === key
          return (
            <Button
              key={key}
              variant="ghost"
              title={key}
              onClick={() => { onSelect(key); onClose() }}
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
    </div>,
    document.body,
  )
}
