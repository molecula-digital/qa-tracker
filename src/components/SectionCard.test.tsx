import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SectionCard } from './SectionCard'
import type { Section } from '../types/tracker'

const section: Section = {
  id: 's1', title: 'Auth', open: true,
  items: [
    { id: 'i1', text: 'Login works', checked: true,  tags: [], notes: [] },
    { id: 'i2', text: 'Logout works', checked: false, tags: [], notes: [] },
  ],
}

const defaultProps = {
  section,
  search: '',
  onToggle: vi.fn(),
  onTitleChange: vi.fn(),
  onDelete: vi.fn(),
  onAddItem: vi.fn(),
  onDeleteItem: vi.fn(),
  onToggleItem: vi.fn(),
  onUpdateItemText: vi.fn(),
  onAddTag: vi.fn(),
  onRemoveTag: vi.fn(),
  onAddNote: vi.fn(),
  onDeleteNote: vi.fn(),
  onOpenTagPicker: vi.fn(),
  onColorChange: vi.fn(),
  onIconChange: vi.fn(),
}

describe('SectionCard', () => {
  it('renders the section title', () => {
    render(<SectionCard {...defaultProps} />)
    expect(screen.getByDisplayValue('Auth')).toBeInTheDocument()
  })

  it('renders badge showing done/total', () => {
    render(<SectionCard {...defaultProps} />)
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it('renders all items when open', () => {
    render(<SectionCard {...defaultProps} />)
    expect(screen.getByDisplayValue('Login works')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Logout works')).toBeInTheDocument()
  })

  it('hides body when section is closed', () => {
    const closed = { ...section, open: false }
    render(<SectionCard {...defaultProps} section={closed} />)
    expect(screen.queryByDisplayValue('Login works')).not.toBeInTheDocument()
  })

  it('filters items by search', () => {
    render(<SectionCard {...defaultProps} search="login" />)
    const loginInput = screen.getByDisplayValue('Login works')
    const logoutInput = screen.getByDisplayValue('Logout works')
    expect(loginInput.closest('.hidden')).toBeNull()         // login is visible
    expect(logoutInput.closest('.hidden')).not.toBeNull()    // logout is hidden
  })

  it('calls onToggle when header clicked', () => {
    const onToggle = vi.fn()
    render(<SectionCard {...defaultProps} onToggle={onToggle} />)
    fireEvent.click(screen.getByText('Auth').closest('div[class*="cursor-pointer"]')!)
    expect(onToggle).toHaveBeenCalledOnce()
  })
})
