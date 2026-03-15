import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TagPicker } from './TagPicker'
import type { Item } from '../types/tracker'

const baseItem: Item = {
  id: 'i1', text: 'Test', checked: false, tags: [], notes: [],
}
const anchorEl = document.createElement('button')

describe('TagPicker', () => {
  it('renders all three tag options', () => {
    render(
      <TagPicker item={baseItem} anchorEl={anchorEl} onToggleTag={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.getByText('Bug')).toBeInTheDocument()
    expect(screen.getByText('Question')).toBeInTheDocument()
    expect(screen.getByText('Later')).toBeInTheDocument()
  })

  it('calls onToggleTag when a tag option is clicked', () => {
    const onToggleTag = vi.fn()
    render(
      <TagPicker item={baseItem} anchorEl={anchorEl} onToggleTag={onToggleTag} onClose={vi.fn()} />
    )
    fireEvent.click(screen.getByText('Bug'))
    expect(onToggleTag).toHaveBeenCalledWith('bug')
  })

  it('shows checkmark for active tags', () => {
    const itemWithBug: Item = { ...baseItem, tags: ['bug'] }
    render(
      <TagPicker item={itemWithBug} anchorEl={anchorEl} onToggleTag={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.getByText('✓')).toBeInTheDocument()
  })
})
