import { ClipboardIcon, CheckCircleIcon, ClockIcon, LayersIcon, RotateCcwIcon } from './Icons'

interface StatsBarProps {
  total: number
  passed: number
  pending: number
  sections: number
  onClearAll: () => void
}

export function StatsBar({ total, passed, pending, sections, onClearAll }: StatsBarProps) {
  const pct = total ? Math.round((passed / total) * 100) : 0

  const stats = [
    { label: 'Total',    value: total,    color: '#3a3228', icon: <ClipboardIcon />,   iconColor: '#8a7d6e' },
    { label: 'Passed',   value: passed,   color: '#7a8c5c', icon: <CheckCircleIcon />, iconColor: '#7a8c5c' },
    { label: 'Pending',  value: pending,  color: '#b08a3e', icon: <ClockIcon />,       iconColor: '#b08a3e' },
    { label: 'Sections', value: sections, color: '#3a3228', icon: <LayersIcon />,      iconColor: '#8a7d6e' },
  ]

  return (
    <div style={{ background: '#fff', border: '1px solid #ddd5c2', borderRadius: 16, padding: '20px 24px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {stats.map(({ label, value, color, icon, iconColor }) => (
          <div key={label} style={{ background: '#faf8f3', border: '1px solid #ddd5c2', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ color: iconColor, opacity: 0.45, marginBottom: 6, display: 'flex', justifyContent: 'center' }}>{icon}</div>
            <div style={{ fontSize: 24, fontWeight: 600, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 11, color: '#8a7d6e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar + clear button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: '#8a7d6e' }}>Progress</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#7a8c5c' }}>{pct}%</span>
          </div>
          <div style={{ height: 8, background: '#e8e0d0', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#7a8c5c', borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>
        </div>
        <button
          onClick={onClearAll}
          title="Reset all item statuses"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid #ddd5c2', borderRadius: 8, background: '#faf8f3', fontSize: 12, color: '#8a7d6e', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          <RotateCcwIcon /> Clear all
        </button>
      </div>
    </div>
  )
}
