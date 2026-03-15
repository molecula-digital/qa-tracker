import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'

const COLORS = [
  { label: 'Default',   value: '',        bg: '#333',    border: '#555' },
  { label: 'Sage',      value: '#e8f0de', bg: '#3a4a2e', border: '#4a5a3e' },
  { label: 'Sky',       value: '#deeaf5', bg: '#2a3a4a', border: '#3a4a5a' },
  { label: 'Blush',     value: '#f5e4e4', bg: '#4a2a2a', border: '#5a3a3a' },
  { label: 'Lavender',  value: '#ece8f5', bg: '#3a2a4a', border: '#4a3a5a' },
  { label: 'Peach',     value: '#f5ede0', bg: '#4a3a2a', border: '#5a4a3a' },
  { label: 'Mint',      value: '#dff5ef', bg: '#2a4a3a', border: '#3a5a4a' },
  { label: 'Lemon',     value: '#f5f2d0', bg: '#4a4a2a', border: '#5a5a3a' },
  { label: 'Slate',     value: '#e2e8f0', bg: '#2a2e38', border: '#3a3e48' },
  { label: 'Rose',      value: '#fce7f3', bg: '#4a2a3a', border: '#5a3a4a' },
]

interface SectionColorPickerProps {
  currentColor: string | undefined
  anchorEl: HTMLElement
  onSelect: (color: string) => void
  onClose: () => void
}

export function SectionColorPicker({ currentColor, anchorEl, onSelect, onClose }: SectionColorPickerProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  const rect = anchorEl.getBoundingClientRect()
  const top = rect.bottom + window.scrollY + 6
  const left = Math.min(rect.left + window.scrollX, window.innerWidth - 220)

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
      className="absolute z-[9999] rounded-xl border border-neutral-700 bg-neutral-900 p-3 shadow-xl"
      style={{ top, left }}
    >
      <p className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold mb-2">
        Section color
      </p>
      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
        {COLORS.map((c) => {
          const active = (currentColor ?? '') === c.value
          return (
            <Button
              key={c.value || 'default'}
              variant="ghost"
              title={c.label}
              onClick={() => { onSelect(c.value); onClose() }}
              className="w-7 h-7 p-0 rounded-lg"
              style={{
                background: c.bg,
                border: active ? '2px solid #e5e5e5' : `1px solid ${c.border}`,
                boxShadow: active ? '0 0 0 2px rgba(255,255,255,0.15)' : 'none',
              }}
            />
          )
        })}
      </div>
    </div>,
    document.body,
  )
}
