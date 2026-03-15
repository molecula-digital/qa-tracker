import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useLocalStorage } from './useLocalStorage'

const mockStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true })

describe('useLocalStorage', () => {
  beforeEach(() => mockStorage.clear())

  it('returns default value when nothing is stored', () => {
    const { result } = renderHook(() => useLocalStorage('k', 42))
    expect(result.current[0]).toBe(42)
  })

  it('loads existing value from localStorage', () => {
    mockStorage.setItem('k', '99')
    const { result } = renderHook(() => useLocalStorage('k', 0))
    expect(result.current[0]).toBe(99)
  })

  it('persists a direct value to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('k', 0))
    act(() => result.current[1](7))
    expect(result.current[0]).toBe(7)
    expect(mockStorage.getItem('k')).toBe('7')
  })

  it('supports updater function form and persists result', () => {
    const { result } = renderHook(() => useLocalStorage('k', 10))
    act(() => result.current[1](prev => prev + 5))
    expect(result.current[0]).toBe(15)
    expect(mockStorage.getItem('k')).toBe('15')
  })

  it('falls back to default on invalid JSON', () => {
    mockStorage.setItem('k', 'not-json{{{')
    const { result } = renderHook(() => useLocalStorage('k', 'default'))
    expect(result.current[0]).toBe('default')
  })
})
