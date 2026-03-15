import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useTracker } from './useTracker'

// Re-use same localStorage mock
const mockStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true })

describe('useTracker actions', () => {
  beforeEach(() => mockStorage.clear())

  it('starts with empty sections', () => {
    const { result } = renderHook(() => useTracker())
    expect(result.current.data.sections).toEqual([])
  })

  it('addSection adds a section with open:true', () => {
    const { result } = renderHook(() => useTracker())
    act(() => result.current.actions.addSection())
    expect(result.current.data.sections).toHaveLength(1)
    expect(result.current.data.sections[0].open).toBe(true)
    expect(result.current.data.sections[0].items).toEqual([])
  })

  it('deleteSection removes the correct section', () => {
    const { result } = renderHook(() => useTracker())
    act(() => result.current.actions.addSection())
    act(() => result.current.actions.addSection())
    const id = result.current.data.sections[0].id
    act(() => result.current.actions.deleteSection(id))
    expect(result.current.data.sections).toHaveLength(1)
    expect(result.current.data.sections[0].id).not.toBe(id)
  })

  it('addItem adds an item to the correct section', () => {
    const { result } = renderHook(() => useTracker())
    act(() => result.current.actions.addSection())
    const secId = result.current.data.sections[0].id
    act(() => result.current.actions.addItem(secId, 'Test item'))
    expect(result.current.data.sections[0].items).toHaveLength(1)
    expect(result.current.data.sections[0].items[0].text).toBe('Test item')
    expect(result.current.data.sections[0].items[0].checked).toBe(false)
  })

  it('toggleItem flips checked state', () => {
    const { result } = renderHook(() => useTracker())
    act(() => result.current.actions.addSection())
    const secId = result.current.data.sections[0].id
    act(() => result.current.actions.addItem(secId, 'item'))
    const itemId = result.current.data.sections[0].items[0].id
    act(() => result.current.actions.toggleItem(secId, itemId))
    expect(result.current.data.sections[0].items[0].checked).toBe(true)
    act(() => result.current.actions.toggleItem(secId, itemId))
    expect(result.current.data.sections[0].items[0].checked).toBe(false)
  })

  it('addTag and removeTag work correctly', () => {
    const { result } = renderHook(() => useTracker())
    act(() => result.current.actions.addSection())
    const secId = result.current.data.sections[0].id
    act(() => result.current.actions.addItem(secId, 'item'))
    const itemId = result.current.data.sections[0].items[0].id
    act(() => result.current.actions.addTag(secId, itemId, 'bug'))
    expect(result.current.data.sections[0].items[0].tags).toContain('bug')
    act(() => result.current.actions.removeTag(secId, itemId, 'bug'))
    expect(result.current.data.sections[0].items[0].tags).not.toContain('bug')
  })

  it('addNote and deleteNote work correctly', () => {
    const { result } = renderHook(() => useTracker())
    act(() => result.current.actions.addSection())
    const secId = result.current.data.sections[0].id
    act(() => result.current.actions.addItem(secId, 'item'))
    const itemId = result.current.data.sections[0].items[0].id
    act(() => result.current.actions.addNote(secId, itemId, 'my note'))
    const notes = result.current.data.sections[0].items[0].notes
    expect(notes).toHaveLength(1)
    expect(notes[0].text).toBe('my note')
    act(() => result.current.actions.deleteNote(secId, itemId, notes[0].id))
    expect(result.current.data.sections[0].items[0].notes).toHaveLength(0)
  })

  it('search state updates via setSearch', () => {
    const { result } = renderHook(() => useTracker())
    act(() => result.current.setSearch('hello'))
    expect(result.current.search).toBe('hello')
  })

  it('persists data to localStorage key release_tracker_v1', () => {
    const { result } = renderHook(() => useTracker())
    act(() => result.current.actions.addSection())
    const stored = JSON.parse(mockStorage.getItem('release_tracker_v1')!)
    expect(stored.sections).toHaveLength(1)
  })
})
