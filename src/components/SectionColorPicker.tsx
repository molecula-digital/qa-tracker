import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'

const COLORS = [
  { label: 'Default',   value: '',        lightBg: '#e8e4dd', darkBg: '#333',    lightBorder: '#ccc5b8', darkBorder: '#555' },
  { label: 'Sage',      value: '#e8f0de', lightBg: '#e8f0de', darkBg: '#3a4a2e', lightBorder: '#b8ceaa', darkBorder: '#4a5a3e' },
  { label: 'Sky',       value: '#deeaf5', lightBg: '#deeaf5', darkBg: '#2a3a4a', lightBorder: '#a9c8e8', darkBorder: '#3a4a5a' },
  { label: 'Blush',     value: '#f5e4e4', lightBg: '#f5e4e4', darkBg: '#4a2a2a', lightBorder: '#e0b0b0', darkBorder: '#5a3a3a' },
  { label: 'Lavender',  value: '#ece8f5', lightBg: '#ece8f5', darkBg: '#3a2a4a', lightBorder: '#bfb0e0', darkBorder: '#4a3a5a' },
  { label: 'Peach',     value: '#f5ede0', lightBg: '#f5ede0', darkBg: '#4a3a2a', lightBorder: '#e0c090', darkBorder: '#5a4a3a' },
  { label: 'Mint',      value: '#dff5ef', lightBg: '#dff5ef', darkBg: '#2a4a3a', lightBorder: '#9fd8ca', darkBorder: '#3a5a4a' },
  { label: 'Lemon',     value: '#f5f2d0', lightBg: '#f5f2d0', darkBg: '#4a4a2a', lightBorder: '#d8cc80', darkBorder: '#5a5a3a' },
  { label: 'Slate',     value: '#e2e8f0', lightBg: '#e2e8f0', darkBg: '#2a2e38', lightBorder: '#94a3b8', darkBorder: '#3a3e48' },
  { label: 'Rose',      value: '#fce7f3', lightBg: '#fce7f3', darkBg: '#4a2a3a', lightBorder: '#f0abcb', darkBorder: '#5a3a4a' },
]

interface SectionColorPickerProps {
  currentColor: string | undefined
  anchorEl: HTMLElement
  onSelect: (color: string) => void
  onClose: () => void
}

export function SectionColorPicker({ currentColor, anchorEl, onSelect, onClose }: SectionColorPickerProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')

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
      className="absolute z-[9999] rounded-xl border border-border bg-popover p-3 shadow-xl"
      style={{ top, left }}
    >
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
        Section color
      </p>
      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
        {COLORS.map((c) => {
          const active = (currentColor ?? '') === c.value
          const bg = isDark ? c.darkBg : c.lightBg
          const border = isDark ? c.darkBorder : c.lightBorder
          return (
            <Button
              key={c.value || 'default'}
              variant="ghost"
              title={c.label}
              onClick={() => { onSelect(c.value); onClose() }}
              className="w-7 h-7 p-0 rounded-lg"
              style={{
                background: bg,
                border: active ? '2px solid var(--foreground)' : `1px solid ${border}`,
                boxShadow: active ? '0 0 0 2px var(--ring)' : 'none',
              }}
            />
          )
        })}
      </div>
    </div>,
    document.body,
  )
}
