export function KanbanSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden pb-6 pt-1 h-full animate-pulse">
      {[0, 1, 2, 3].map((col) => (
        <div key={col} className="w-[300px] shrink-0 h-full flex flex-col bg-muted/30 rounded-[14px] border-2 border-border/30">
          <div className="flex items-center gap-2 px-3 py-3 rounded-t-[12px] border-b border-border/20">
            <div className="h-3.5 w-24 bg-muted rounded" />
            <div className="ml-auto h-4 w-8 bg-muted rounded-full" />
          </div>
          <div className="flex-1 p-2 space-y-1.5">
            {[56, 72, 48, 64, 40].slice(0, col === 0 ? 4 : col === 1 ? 5 : col === 2 ? 3 : 4).map((h, i) => (
              <div key={i} className="rounded-xl bg-muted/40 border border-border/20" style={{ height: h }} />
            ))}
          </div>
          <div className="px-3 py-2.5 border-t border-border/20">
            <div className="h-3 w-20 bg-muted/40 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse pt-1">
      {[0, 1, 2].map((sec) => (
        <div key={sec} className="rounded-[14px] border-2 border-border/30 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-3 bg-muted/30 border-b border-border/20">
            <div className="h-3 w-3 bg-muted rounded" />
            <div className="h-3.5 w-32 bg-muted rounded" />
            <div className="ml-auto h-4 w-10 bg-muted rounded-full" />
          </div>
          <div className="divide-y divide-border/10">
            {[0, 1, 2, 3, 4].slice(0, sec === 0 ? 4 : sec === 1 ? 5 : 3).map((row) => (
              <div key={row} className="flex items-center gap-2.5 px-3 py-2.5">
                <div className="w-4 h-4 bg-muted rounded shrink-0" />
                <div className="h-3 bg-muted/40 rounded" style={{ width: `${[75, 60, 85, 50, 70][row]}%` }} />
              </div>
            ))}
          </div>
          <div className="px-3 py-2.5 border-t border-border/20">
            <div className="h-3 w-20 bg-muted/40 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
