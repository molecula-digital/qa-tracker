import { useState, useCallback, useRef } from 'react'

type SetValue<T> = (value: T | ((prev: T) => T)) => void

export function useLocalStorage<T>(key: string, defaultValue: T): [T, SetValue<T>] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? (JSON.parse(item) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  // Ref mirrors state so setValue can read current value without stale closure
  const stateRef = useRef(state)
  stateRef.current = state

  const setValue = useCallback<SetValue<T>>(
    (value) => {
      // Resolve new value outside of React's setState — no side effects inside updater
      const newValue =
        typeof value === 'function'
          ? (value as (prev: T) => T)(stateRef.current)
          : value
      setState(newValue)
      try {
        localStorage.setItem(key, JSON.stringify(newValue))
      } catch { /* ignore quota errors */ }
    },
    [key],
  )

  return [state, setValue]
}
