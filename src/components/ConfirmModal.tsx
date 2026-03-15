import { createPortal } from 'react-dom'
import { TrashIcon } from './Icons'

interface ConfirmModalProps {
  title: string
  body: string
  onConfirm: () => void
  onClose: () => void
  confirmLabel?: string
  hideCancel?: boolean
}

export function ConfirmModal({
  title,
  body,
  onConfirm,
  onClose,
  confirmLabel = 'Delete',
  hideCancel = false,
}: ConfirmModalProps) {
  const content = (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(40,30,20,.4)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#f2ede3', border: '1px solid #ddd5c2', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', width: '100%', maxWidth: 360, margin: '0 16px', padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#3a3228', fontFamily: "Georgia, 'Times New Roman', serif" }}>
          {title}
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: '#8a7d6e', lineHeight: 1.6 }}>{body}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {!hideCancel && (
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd5c2', background: '#faf8f3', color: '#8a7d6e', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#a33333', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {confirmLabel === 'Delete' && <TrashIcon />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
