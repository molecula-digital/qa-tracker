'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Check } from 'lucide-react'
import { useMembers, type Member } from '@/hooks/use-members'
import type { ItemAssignee } from '@/types/tracker'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface AssigneePickerProps {
  assignees: ItemAssignee[]
  anchorEl: HTMLElement
  onToggleAssignee: (member: Member) => void
  onClose: () => void
}

export function AssigneePicker({ assignees, anchorEl, onToggleAssignee, onClose }: AssigneePickerProps) {
  const { data: members = [], isLoading } = useMembers()
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const assignedIds = new Set(assignees.map(a => a.id))

  const filtered = members.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())
  )

  // Position relative to anchor
  useEffect(() => {
    if (!ref.current || !anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const el = ref.current
    el.style.position = 'fixed'
    el.style.top = `${rect.bottom + 4}px`
    el.style.left = `${rect.left}px`
    el.style.zIndex = '50'
  }, [anchorEl])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [anchorEl, onClose])

  return (
    <div ref={ref} className="w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Search size={14} className="text-muted-foreground shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          autoFocus
          className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Member list */}
      <div className="max-h-[240px] overflow-y-auto py-1">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No members found</p>
        ) : (
          filtered.map((m) => {
            const isAssigned = assignedIds.has(m.id)
            return (
              <button
                key={m.id}
                onClick={() => onToggleAssignee(m)}
                className="flex items-center gap-2.5 w-full px-3 py-1.5 text-left hover:bg-accent/50 transition-colors"
              >
                <Avatar className="w-6 h-6 shrink-0">
                  {m.image && <AvatarImage src={m.image} alt={m.name} />}
                  <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                    {m.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{m.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                </div>
                {isAssigned && (
                  <Check size={14} className="text-emerald-500 shrink-0" />
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
