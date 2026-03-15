import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ItemRow } from './ItemRow'
import type { Item } from '../types/tracker'

const baseItem: Item = {
  id: 'i1', text: 'Login flow', checked: false, tags: [], notes: [],
}

const defaultProps = {
  item: baseItem,
  visible: true,
  onToggle: vi.fn(),
  onUpdateText: vi.fn(),
  onDelete: vi.fn(),
  onAddTag: vi.fn(),
  onRemoveTag: vi.fn(),
  onAddNote: vi.fn(),
  onDeleteNote: vi.fn(),
  onOpenTagPicker: vi.fn(),
}

describe('ItemRow', () => {
  it('renders item text', () => {
    render(<ItemRow {...defaultProps} />)
    expect(screen.getByDisplayValue('Login flow')).toBeInTheDocument()
  })

  it('applies hidden class when visible is false (does NOT unmount)', () => {
    const { container } = render(<ItemRow {...defaultProps} visible={false} />)
    expect(container.firstChild).toHaveClass('hidden')
    // Input still in DOM — local state preserved
    expect(screen.getByDisplayValue('Login flow')).toBeInTheDocument()
  })

  it('calls onToggle when checkbox clicked', () => {
    const onToggle = vi.fn()
    render(<ItemRow {...defaultProps} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('shows line-through on label when checked', () => {
    const checked: Item = { ...baseItem, checked: true }
    render(<ItemRow {...defaultProps} item={checked} />)
    expect(screen.getByDisplayValue('Login flow')).toHaveClass('line-through')
  })

  it('shows tag badges for active tags', () => {
    const tagged: Item = { ...baseItem, tags: ['bug'] }
    render(<ItemRow {...defaultProps} item={tagged} />)
    expect(screen.getByText('Bug')).toBeInTheDocument()
  })

  it('shows comment dot when item has notes', () => {
    const noted: Item = { ...baseItem, notes: [{ id: 'n1', text: 'note', ts: 0 }] }
    const { container } = render(<ItemRow {...defaultProps} item={noted} />)
    // The dot has title="Has comments"
    expect(container.querySelector('[title="Has comments"]')).toBeInTheDocument()
  })

  it('toggles notes panel open on notes button click', () => {
    render(<ItemRow {...defaultProps} />)
    const notesBtn = screen.getByTitle(/comments/i)
    fireEvent.click(notesBtn)
    expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument()
  })
})
