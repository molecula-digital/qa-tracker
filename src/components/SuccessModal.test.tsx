import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SuccessModal } from './SuccessModal'

describe('SuccessModal', () => {
  it('renders title and body', () => {
    render(<SuccessModal title="Export complete" body="Saved 2 section(s)" onClose={vi.fn()} />)
    expect(screen.getByText('Export complete')).toBeInTheDocument()
    expect(screen.getByText('Saved 2 section(s)')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<SuccessModal title="t" body="b" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn()
    render(<SuccessModal title="t" body="b" onClose={onClose} />)
    fireEvent.click(screen.getByTestId('success-overlay'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
