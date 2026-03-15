import { useRef } from 'react'
import { BarChart2 } from 'lucide-react'
import { SearchIcon, PlusIcon, DownloadIcon, UploadIcon } from './Icons'

interface ToolbarProps {
  search: string
  onSearchChange: (q: string) => void
  onAddSection: () => void
  onExport: () => void
  onImport: (file: File) => void
  onShowStats: () => void
  statsSummary: string
}

export function Toolbar({ search, onSearchChange, onAddSection, onExport, onImport, onShowStats, statsSummary }: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const btn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px',
    border: '1px solid #ddd5c2', borderRadius: 9, cursor: 'pointer',
    whiteSpace: 'nowrap', fontFamily: 'inherit', fontSize: 13,
    background: '#fff', color: '#3a3228', flexShrink: 0,
  }

  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'nowrap' }}>
      {/* Search — compact */}
      <div style={{ width: 172, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', border: '1px solid #ddd5c2', borderRadius: 9, background: '#fff', flexShrink: 0 }}>
        <span style={{ color: '#8a7d6e', flexShrink: 0, display: 'flex' }}><SearchIcon /></span>
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#3a3228', width: '100%', fontFamily: 'inherit', padding: 0 }}
        />
      </div>

      {/* Stats */}
      <button style={btn} onClick={onShowStats} title="Progress overview">
        <BarChart2 size={14} /> {statsSummary}
      </button>

      {/* Export */}
      <button style={btn} onClick={onExport} aria-label="Export JSON" title="Export JSON">
        <DownloadIcon /> Export
      </button>

      {/* Import */}
      <label style={{ ...btn, cursor: 'pointer' }} title="Import JSON">
        <UploadIcon /> Import
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { onImport(f); e.target.value = '' } }}
        />
      </label>

      {/* Add section */}
      <button
        style={{ ...btn, background: '#7a8c5c', borderColor: '#7a8c5c', color: '#fff', fontWeight: 600 }}
        onClick={onAddSection}
        aria-label="Add section"
      >
        <PlusIcon /> Add section
      </button>
    </div>
  )
}
