'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, UserPlus, Pencil, CheckCircle2, MessageSquare } from 'lucide-react'
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead, type Notification } from '@/hooks/use-notifications'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useRouter } from 'next/navigation'

const TYPE_ICONS = {
  assigned: UserPlus,
  item_updated: Pencil,
  item_checked: CheckCircle2,
  note_added: MessageSquare,
} as const

function timeAgo(dateStr: string) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { data: notifications = [] } = useNotifications()
  const { data: unreadData } = useUnreadCount()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const unreadCount = unreadData?.count ?? 0

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleClick = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id)
    if (n.projectId) {
      router.push(`/dashboard/projects/${n.projectId}`)
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        title="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] text-white font-medium flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Bell size={24} strokeWidth={1.4} className="mb-2 opacity-40" />
                <span className="text-xs">No notifications yet</span>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] ?? Bell
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex items-start gap-3 w-full px-4 py-3 text-left hover:bg-accent/30 transition-colors border-b border-border/50 last:border-b-0 ${
                      !n.read ? 'bg-accent/10' : ''
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                      !n.read ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] leading-tight ${!n.read ? 'text-foreground font-medium' : 'text-foreground/80'}`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{n.body}</p>
                      <span className="text-[10px] text-muted-foreground/60 mt-1 block">{timeAgo(n.createdAt)}</span>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
