import { createPortal } from 'react-dom'

interface SuccessModalProps {
  title: string
  body: string
  onClose: () => void
}

export function SuccessModal({ title, body, onClose }: SuccessModalProps) {
  return createPortal(
    <div
      data-testid="success-overlay"
      style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(40,30,20,.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#faf8f3', border: '1px solid #ddd5c2', borderRadius: 18, padding: 36, maxWidth: 360, width: 'calc(100% - 2rem)', boxShadow: '0 16px 48px rgba(0,0,0,0.16)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18 }}>
        <svg
          className="animate-pop-circle"
          width="56" height="56" viewBox="0 0 56 56" fill="none"
        >
          <circle cx="28" cy="28" r="26" fill="#e0ead4" stroke="#7a8c5c" strokeWidth="1.5" />
          <path
            className="animate-draw-check"
            d="M17 28.5l8 8 14-15"
            stroke="#7a8c5c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <div>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: '#3a3228' }}>{title}</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#8a7d6e', lineHeight: 1.6 }}>{body}</p>
        </div>
        <button
          aria-label="Close"
          style={{ padding: '8px 20px', border: '1px solid #ddd5c2', borderRadius: 8, background: '#fff', fontSize: 13, color: '#3a3228', cursor: 'pointer', fontFamily: 'inherit' }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>,
    document.body,
  )
}
