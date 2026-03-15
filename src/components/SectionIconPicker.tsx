import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SECTION_ICONS, ICON_GROUPS, type SectionIconKey } from './SectionIcons'

interface SectionIconPickerProps {
  currentIcon: string | undefined
  anchorEl: HTMLElement
  onSelect: (icon: string) => void
  onClose: () => void
}

export function SectionIconPicker({ currentIcon, anchorEl, onSelect, onClose }: SectionIconPickerProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [activeGroup, setActiveGroup] = useState(0)

  // Position below anchor, keep within viewport
  const rect = anchorEl.getBoundingClientRect()
  const top = rect.bottom + window.scrollY + 6
  const rawLeft = rect.left + window.scrollX
  const maxLeft = window.innerWidth - 260
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

  const group = ICON_GROUPS[activeGroup]

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        position: 'absolute', top, left, zIndex: 9999, width: 248,
        background: '#fff', border: '1px solid #ddd5c2', borderRadius: 12,
        padding: '12px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ fontSize: 11, color: '#8a7d6e', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>
        Section icon
      </div>

      {/* Group tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {ICON_GROUPS.map((g, i) => (
          <button
            key={g.label}
            onClick={() => setActiveGroup(i)}
            style={{
              flex: 1, fontSize: 11, padding: '4px 0', border: '1px solid #ddd5c2',
              borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
              background: activeGroup === i ? '#3a3228' : '#faf8f3',
              color: activeGroup === i ? '#fff' : '#8a7d6e',
              fontWeight: activeGroup === i ? 600 : 400,
            }}
          >
            {g.label}
          </button>
        ))}
        {/* None option */}
        <button
          onClick={() => { onSelect(''); onClose() }}
          style={{
            fontSize: 11, padding: '4px 8px', border: '1px solid #ddd5c2',
            borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
            background: !currentIcon ? '#3a3228' : '#faf8f3',
            color: !currentIcon ? '#fff' : '#8a7d6e',
          }}
        >
          None
        </button>
      </div>

      {/* Icon grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {group.keys.map((key) => {
          const IconComp = SECTION_ICONS[key as SectionIconKey]
          const active = currentIcon === key
          return (
            <button
              key={key}
              title={key}
              onClick={() => { onSelect(key); onClose() }}
              style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: active ? '2px solid #3a3228' : '1px solid #e8e0d0',
                borderRadius: 8, background: active ? '#f2ede3' : '#faf8f3',
                cursor: 'pointer', color: active ? '#3a3228' : '#8a7d6e',
                flexShrink: 0,
              }}
            >
              <IconComp size={15} />
            </button>
          )
        })}
      </div>
    </div>,
    document.body,
  )
}
