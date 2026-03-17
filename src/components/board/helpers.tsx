import type React from 'react'

export function getHeaderColor(hex: string | undefined, isDark: boolean): string {
  if (!hex) return 'var(--kanban-header)'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  if (isDark) {
    return `rgb(${Math.round(r * 0.35)}, ${Math.round(g * 0.35)}, ${Math.round(b * 0.35)})`
  }
  return `rgb(${Math.round(r * 0.85 + 38)}, ${Math.round(g * 0.85 + 38)}, ${Math.round(b * 0.85 + 38)})`
}

/**
 * Renders text with clickable links.
 * Note: regex is created fresh per call to avoid stateful /g lastIndex bug.
 */
export function renderTextWithLinks(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s<>"')\]]+)/g
  const parts = text.split(urlRegex)
  if (parts.length === 1) return text
  return parts.map((part, i) => {
    // Use a separate non-/g regex for testing (the /g on split is fine since it's fresh per call)
    if (/(https?:\/\/[^\s<>"')\]]+)/.test(part)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{part}</a>
    }
    return part
  })
}

export function isWithinRange(ts: number | undefined, range: 'today' | 'week' | 'month'): boolean {
  if (!ts) return false
  const now = Date.now()
  const diff = now - ts
  switch (range) {
    case 'today': return diff < 86_400_000
    case 'week': return diff < 604_800_000
    case 'month': return diff < 2_592_000_000
  }
}
