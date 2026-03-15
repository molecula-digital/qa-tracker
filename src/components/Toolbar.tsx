import { useRef } from 'react'
import { SearchIcon, PlusIcon, DownloadIcon, UploadIcon } from './Icons'

interface ToolbarProps {
  search: string
  onSearchChange: (q: string) => void
  onAddSection: () => void
  onExport: () => void
  onImport: (file: File) => void
}

export function Toolbar({ search, onSearchChange, onAddSection, onExport, onImport }: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const btnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    border: '1px solid #ddd5c2',
    borderRadius: 10,
    background: '#fff',
    fontSize: 13,
    color: '#3a3228',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    fontFamily: 'inherit',
    transition: 'background 0.15s, border-color 0.15s',
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
      {/* Search */}
      <div style={{ flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid #ddd5c2', borderRadius: 10, background: '#fff' }}>
        <span style={{ color: '#8a7d6e', flexShrink: 0, display: 'flex' }}>
          <SearchIcon />
        </span>
        <input
          type="text"
          placeholder="Search tests…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#3a3228', width: '100%', fontFamily: 'inherit', padding: 0 }}
        />
      </div>

      {/* Export */}
      <button style={btnStyle} onClick={onExport} aria-label="Export JSON">
        <DownloadIcon /> Export JSON
      </button>

      {/* Import */}
      <label style={{ ...btnStyle, cursor: 'pointer' }}>
        <UploadIcon /> Import JSON
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              onImport(file)
              e.target.value = ''
            }
          }}
        />
      </label>

      {/* Add section */}
      <button
        style={{ ...btnStyle, background: '#7a8c5c', borderColor: '#7a8c5c', color: '#fff', fontWeight: 500 }}
        onClick={onAddSection}
        aria-label="Add section"
      >
        <PlusIcon /> Add section
      </button>
    </div>
  )
}
