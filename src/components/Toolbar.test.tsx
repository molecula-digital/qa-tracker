import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Toolbar } from './Toolbar'

describe('Toolbar', () => {
  const defaultProps = {
    search: '',
    onSearchChange: vi.fn(),
    onAddSection: vi.fn(),
    onExport: vi.fn(),
    onImport: vi.fn(),
  }

  it('renders search input, add, export, and import controls', () => {
    render(<Toolbar {...defaultProps} />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add section/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
    expect(screen.getByText(/import/i)).toBeInTheDocument()
  })

  it('calls onSearchChange when typing in search', () => {
    const onSearchChange = vi.fn()
    render(<Toolbar {...defaultProps} onSearchChange={onSearchChange} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'hello' } })
    expect(onSearchChange).toHaveBeenCalledWith('hello')
  })

  it('calls onAddSection when Add section clicked', () => {
    const onAddSection = vi.fn()
    render(<Toolbar {...defaultProps} onAddSection={onAddSection} />)
    fireEvent.click(screen.getByRole('button', { name: /add section/i }))
    expect(onAddSection).toHaveBeenCalledOnce()
  })

  it('calls onExport when Export JSON clicked', () => {
    const onExport = vi.fn()
    render(<Toolbar {...defaultProps} onExport={onExport} />)
    fireEvent.click(screen.getByRole('button', { name: /export/i }))
    expect(onExport).toHaveBeenCalledOnce()
  })
})
