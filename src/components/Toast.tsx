'use client'

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

export interface ToastData {
  id: string
  title: string
  body?: string
  onClick?: () => void
}

let _addToast: ((toast: Omit<ToastData, 'id'>) => void) | null = null

/** Global function to show a toast from anywhere */
export function showToast(toast: Omit<ToastData, 'id'>) {
  _addToast?.(toast)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }]) // keep max 5
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  useEffect(() => {
    _addToast = addToast
    return () => { _addToast = null }
  }, [addToast])

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={() => { toast.onClick?.(); dismiss(toast.id) }}
            className="pointer-events-auto w-80 bg-popover border border-border rounded-lg shadow-lg px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{toast.title}</p>
                {toast.body && <p className="text-xs text-muted-foreground mt-0.5 truncate">{toast.body}</p>}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismiss(toast.id) }}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
