import { useState, useRef } from 'react'
import { Plus } from 'lucide-react'
import type { TagKey, PriorityKey } from '@/types/tracker'
import { Button } from '@/components/ui/button'

interface AddItemInputProps {
  onAddItem: (text: string, priority?: PriorityKey, tags?: TagKey[]) => void
}

export function AddItemInput({ onAddItem }: AddItemInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const commitAdd = () => {
    const v = value.trim()
    if (v) { onAddItem(v); setValue('') }
  }

  return (
    <div className="border-t border-border/20 px-3 py-2 rounded-b-[12px] shrink-0">
      <div className="flex items-center gap-1.5">
        <Plus size={12} className="text-muted-foreground/40 shrink-0" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') setValue('') }}
          placeholder="Add item…"
          className="flex-1 border-none bg-transparent text-xs text-foreground outline-none font-[inherit] py-0.5 placeholder:text-muted-foreground/40"
        />
        {value.trim() && (
          <Button onClick={commitAdd} size="sm" className="h-6 px-2.5 text-[11px] shrink-0">
            Add
          </Button>
        )}
      </div>
    </div>
  )
}
