import { useLayoutEffect, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Item, TagKey } from '../types/tracker'
import { BugIcon, QuestionIcon, ClockIcon } from './Icons'

interface TagConfig {
  label: string
  dotColor: string
  icon: React.ReactNode
}

const TAGS: Record<TagKey, TagConfig> = {
  bug:      { label: 'Bug',      dotColor: '#c44444', icon: <BugIcon /> },
  question: { label: 'Question', dotColor: '#c48a00', icon: <QuestionIcon /> },
  later:    { label: 'Later',    dotColor: '#2a6ab8', icon: <ClockIcon /> },
}

interface TagPickerProps {
  item: Item
  anchorEl: HTMLButtonElement
  onToggleTag: (tag: TagKey) => void
  onClose: () => void
}

export function TagPicker({ item, anchorEl, onToggleTag, onClose }: TagPickerProps) {
  const popupRef = useRef<HTMLDivElement>(null)

  // Position relative to anchor
  useLayoutEffect(() => {
    const popup = popupRef.current
    if (!popup) return
    const r = anchorEl.getBoundingClientRect()
    const pw = 148, ph = popup.offsetHeight || 120
    let left = r.left, top = r.bottom + 6
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8
    if (top + ph > window.innerHeight - 8) top = r.top - ph - 6
    popup.style.left = Math.max(8, left) + 'px'
    popup.style.top = Math.max(8, top) + 'px'
  })

  // Close on outside click — defer so the opening click doesn't immediately close
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
      style={{ position: 'fixed', zIndex: 9999, background: '#fff', border: '1px solid #ddd5c2', borderRadius: 10, padding: 6, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
      onClick={(e) => e.stopPropagation()}
    >
      {(Object.entries(TAGS) as [TagKey, TagConfig][]).map(([key, cfg]) => {
        const active = item.tags.includes(key)
        return (
          <div
            key={key}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '7px 10px', borderRadius: 7, cursor: 'pointer', background: active ? '#f2ede3' : 'transparent', fontWeight: active ? 500 : 400, color: '#3a3228', whiteSpace: 'nowrap' }}
            onClick={() => onToggleTag(key)}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dotColor, flexShrink: 0, display: 'inline-block' }} />
            {cfg.label}
            {active && (
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8a7d6e' }}>✓</span>
            )}
          </div>
        )
      })}
    </div>,
    document.body,
  )
}
