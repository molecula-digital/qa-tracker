import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const COLORS = [
  { label: 'Default',   value: '',        bg: '#f2ede3', border: '#ddd5c2' },
  { label: 'Sage',      value: '#e8f0de', bg: '#e8f0de', border: '#b8ceaa' },
  { label: 'Sky',       value: '#deeaf5', bg: '#deeaf5', border: '#a9c8e8' },
  { label: 'Blush',     value: '#f5e4e4', bg: '#f5e4e4', border: '#e0b0b0' },
  { label: 'Lavender',  value: '#ece8f5', bg: '#ece8f5', border: '#bfb0e0' },
  { label: 'Peach',     value: '#f5ede0', bg: '#f5ede0', border: '#e0c090' },
  { label: 'Mint',      value: '#dff5ef', bg: '#dff5ef', border: '#9fd8ca' },
  { label: 'Lemon',     value: '#f5f2d0', bg: '#f5f2d0', border: '#d8cc80' },
  { label: 'Slate',     value: '#e2e8f0', bg: '#e2e8f0', border: '#94a3b8' },
  { label: 'Rose',      value: '#fce7f3', bg: '#fce7f3', border: '#f0abcb' },
]

interface SectionColorPickerProps {
  currentColor: string | undefined
  anchorEl: HTMLElement
  onSelect: (color: string) => void
  onClose: () => void
}

export function SectionColorPicker({ currentColor, anchorEl, onSelect, onClose }: SectionColorPickerProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  // Position below anchor
  const rect = anchorEl.getBoundingClientRect()
  const top = rect.bottom + window.scrollY + 6
  const left = rect.left + window.scrollX

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
      style={{
        position: 'absolute', top, left, zIndex: 9999,
        background: '#fff', border: '1px solid #ddd5c2', borderRadius: 12,
        padding: '12px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      <div style={{ fontSize: 11, color: '#8a7d6e', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
        Section color
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 192 }}>
        {COLORS.map((c) => {
          const active = (currentColor ?? '') === c.value
          return (
            <button
              key={c.value || 'default'}
              title={c.label}
              onClick={() => { onSelect(c.value); onClose() }}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: c.bg,
                border: active ? '2px solid #3a3228' : `1px solid ${c.border}`,
                cursor: 'pointer', flexShrink: 0,
                boxShadow: active ? '0 0 0 2px rgba(58,50,40,0.2)' : 'none',
                transition: 'transform 0.1s',
              }}
            />
          )
        })}
      </div>
    </div>,
    document.body,
  )
}
