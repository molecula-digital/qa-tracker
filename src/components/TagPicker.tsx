import { useLayoutEffect, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Item, TagKey } from '../types/tracker'
import { Bug, HelpCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TagConfig {
  label: string
  dotColor: string
  icon: React.ReactNode
}

const TAGS: Record<TagKey, TagConfig> = {
  bug:      { label: 'Bug',      dotColor: '#e05555', icon: <Bug size={13} /> },
  question: { label: 'Question', dotColor: '#d4a020', icon: <HelpCircle size={13} /> },
  later:    { label: 'Later',    dotColor: '#4a8ae0', icon: <Clock size={13} /> },
}

interface TagPickerProps {
  item: Item
  anchorEl: HTMLButtonElement
  onToggleTag: (tag: TagKey) => void
  onClose: () => void
}

export function TagPicker({ item, anchorEl, onToggleTag, onClose }: TagPickerProps) {
  const popupRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const popup = popupRef.current
    if (!popup) return
    const r = anchorEl.getBoundingClientRect()
    const pw = 160, ph = popup.offsetHeight || 130
    let left = r.left, top = r.bottom + 6
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8
    if (top + ph > window.innerHeight - 8) top = r.top - ph - 6
    popup.style.left = Math.max(8, left) + 'px'
    popup.style.top = Math.max(8, top) + 'px'
  })

  useEffect(() => {
    const handler = () => onClose()
    const timer = setTimeout(() => document.addEventListener('click', handler), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handler)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={popupRef}
      className="fixed z-[9999] rounded-xl border border-neutral-700 bg-neutral-900 p-1.5 shadow-xl min-w-[150px]"
      onClick={(e) => e.stopPropagation()}
    >
      {(Object.entries(TAGS) as [TagKey, TagConfig][]).map(([key, cfg]) => {
        const active = item.tags.includes(key)
        return (
          <Button
            key={key}
            variant="ghost"
            onClick={() => onToggleTag(key)}
            className={`w-full justify-start gap-2 h-8 text-[13px] ${
              active ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: cfg.dotColor }}
            />
            {cfg.label}
            {active && (
              <span className="ml-auto text-[11px] text-neutral-500">✓</span>
            )}
          </Button>
        )
      })}
    </div>,
    document.body,
  )
}
