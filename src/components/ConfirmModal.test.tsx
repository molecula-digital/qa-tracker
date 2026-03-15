import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ConfirmModal } from './ConfirmModal'

describe('ConfirmModal', () => {
  it('renders title, body, and default Delete button', () => {
    render(
      <ConfirmModal
        title="Delete section"
        body="Are you sure?"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('Delete section')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('uses confirmLabel when provided', () => {
    render(
      <ConfirmModal
        title="Error"
        body="Something went wrong"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        confirmLabel="Close"
      />
    )
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('hides Cancel button when hideCancel is true', () => {
    render(
      <ConfirmModal
        title="Error"
        body="msg"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        confirmLabel="Close"
        hideCancel
      />
    )
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmModal title="t" body="b" onConfirm={onConfirm} onClose={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn()
    render(
      <ConfirmModal title="t" body="b" onConfirm={vi.fn()} onClose={onClose} />
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
