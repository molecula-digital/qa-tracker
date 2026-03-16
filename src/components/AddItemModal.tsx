import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { TagKey, PriorityKey } from '@/types/tracker'

const PRIORITY_OPTIONS: { value: PriorityKey; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#8888a0' },
  { value: 'medium', label: 'Medium', color: '#d4a020' },
  { value: 'high', label: 'High', color: '#e08a30' },
  { value: 'urgent', label: 'Urgent', color: '#e05555' },
]

const TAG_OPTIONS: { value: TagKey; label: string; color: string }[] = [
  { value: 'bug', label: 'Bug', color: '#e05555' },
  { value: 'question', label: 'Question', color: '#d4a020' },
  { value: 'later', label: 'Later', color: '#4a8ae0' },
]

interface AddItemModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { text: string; priority?: PriorityKey; tags?: TagKey[] }) => void
}

export function AddItemModal({ open, onClose, onSubmit }: AddItemModalProps) {
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<PriorityKey | null>(null)
  const [tags, setTags] = useState<TagKey[]>([])

  const handleSubmit = () => {
    const v = text.trim()
    if (!v) return
    onSubmit({
      text: v,
      priority: priority ?? undefined,
      tags: tags.length > 0 ? tags : undefined,
    })
    setText('')
    setPriority(null)
    setTags([])
    onClose()
  }

  const toggleTag = (tag: TagKey) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Text */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
            className="w-full text-sm border border-border rounded-lg bg-transparent px-3 py-2 outline-none text-foreground font-[inherit] resize-none focus:ring-1 focus:ring-ring/30 transition-colors min-h-[80px]"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
            }}
          />

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Priority</label>
            <div className="flex gap-1.5">
              {PRIORITY_OPTIONS.map((p) => {
                const active = priority === p.value
                return (
                  <button
                    key={p.value}
                    onClick={() => setPriority(active ? null : p.value)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors"
                    style={{
                      background: active ? p.color + '20' : 'transparent',
                      color: active ? p.color : 'var(--muted-foreground)',
                      borderColor: active ? p.color + '40' : 'var(--border)',
                    }}
                  >
                    <span style={{ background: p.color }} className="w-1.5 h-1.5 rounded-full" />
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Tags</label>
            <div className="flex gap-1.5">
              {TAG_OPTIONS.map((t) => {
                const active = tags.includes(t.value)
                return (
                  <button
                    key={t.value}
                    onClick={() => toggleTag(t.value)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors"
                    style={{
                      background: active ? t.color + '20' : 'transparent',
                      color: active ? t.color : 'var(--muted-foreground)',
                      borderColor: active ? t.color + '40' : 'var(--border)',
                    }}
                  >
                    <span style={{ background: t.color }} className="w-1.5 h-1.5 rounded-full" />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!text.trim()}>Add item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
