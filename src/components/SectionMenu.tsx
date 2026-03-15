import { useEffect, forwardRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { TrashIcon } from './Icons'

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
  { anchorEl, sectionColor, SectionIcon, onColor, onIcon, onDelete, onClose },
  ref,
) {
  const rect = anchorEl.getBoundingClientRect()
  const top = rect.bottom + window.scrollY + 4
  const right = window.innerWidth - rect.right

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = (ref as React.RefObject<HTMLDivElement>).current
      if (el && !el.contains(e.target as Node) && e.target !== anchorEl) onClose()
    }
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [anchorEl, onClose, ref])

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '8px 14px', border: 'none', background: 'transparent',
    fontSize: 13, color: '#3a3228', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top, right, zIndex: 9999,
        background: '#fff', border: '1px solid #ddd5c2', borderRadius: 10,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 156,
        padding: '4px 0', overflow: 'hidden',
      }}
    >
      <button style={itemStyle} onClick={onColor}>
        <span style={{ width: 14, height: 14, borderRadius: 4, background: sectionColor || '#f2ede3', border: '1px solid #bbb5aa', flexShrink: 0, display: 'inline-block' }} />
        Color
      </button>
      <button style={itemStyle} onClick={onIcon}>
        {SectionIcon
          ? <SectionIcon size={14} />
          : <span style={{ fontSize: 14, width: 14, textAlign: 'center' }}>✦</span>
        }
        Icon
      </button>
      <div style={{ height: 1, background: '#f0ebe0', margin: '4px 0' }} />
      <button style={{ ...itemStyle, color: '#a33333' }} onClick={onDelete}>
        <TrashIcon />
        Delete section
      </button>
    </div>
  )
})
