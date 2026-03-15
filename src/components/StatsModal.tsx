import { createPortal } from 'react-dom'
import { ClipboardIcon, CheckCircleIcon, ClockIcon, LayersIcon, RotateCcwIcon } from './Icons'

interface StatsModalProps {
  total: number
  passed: number
  pending: number
  sections: number
  onClearAll: () => void
  onClose: () => void
}

export function StatsModal({ total, passed, pending, sections, onClearAll, onClose }: StatsModalProps) {
  const pct = total ? Math.round((passed / total) * 100) : 0

  const cards = [
    { label: 'Total',    value: total,    color: '#3a3228', icon: <ClipboardIcon />,   iconColor: '#8a7d6e' },
    { label: 'Passed',   value: passed,   color: '#7a8c5c', icon: <CheckCircleIcon />, iconColor: '#7a8c5c' },
    { label: 'Pending',  value: pending,  color: '#b08a3e', icon: <ClockIcon />,       iconColor: '#b08a3e' },
    { label: 'Sections', value: sections, color: '#3a3228', icon: <LayersIcon />,      iconColor: '#8a7d6e' },
  ]

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#3a3228' }}>Progress overview</span>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#8a7d6e', lineHeight: 1, padding: '0 4px' }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
          {cards.map(({ label, value, color, icon, iconColor }) => (
            <div key={label} style={{ background: '#faf8f3', border: '1px solid #ddd5c2', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ color: iconColor, opacity: 0.45, marginBottom: 6, display: 'flex', justifyContent: 'center' }}>{icon}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 10, color: '#8a7d6e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#8a7d6e' }}>Progress</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#7a8c5c' }}>{pct}%</span>
          </div>
          <div style={{ height: 8, background: '#e8e0d0', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#7a8c5c', borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        <button
          onClick={() => { onClearAll(); onClose() }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', border: '1px solid #ddd5c2', borderRadius: 8, background: '#faf8f3', fontSize: 13, color: '#8a7d6e', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <RotateCcwIcon /> Reset all
        </button>
      </div>
    </div>,
    document.body,
  )
}
