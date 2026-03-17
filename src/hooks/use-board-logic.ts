import { useState, useRef, useCallback } from 'react'
import type { Section, Item, PriorityKey, TagKey } from '@/types/tracker'
import { PRIORITY_ORDER } from '@/components/board/constants'
import { isWithinRange } from '@/components/board/helpers'

export interface BoardFilters {
  priority: PriorityKey[]
  checked: 'all' | 'checked' | 'unchecked'
  tags: TagKey[]
  dateRange: 'all' | 'today' | 'week' | 'month'
}

export const DEFAULT_FILTERS: BoardFilters = {
  priority: [],
  checked: 'all',
  tags: [],
  dateRange: 'all',
}

export interface ColumnSort {
  field: 'default' | 'priority' | 'date' | 'checked' | 'alpha'
  direction: 'asc' | 'desc'
}

function applyFilters(items: Item[], filters: BoardFilters): Item[] {
  let result = items
  if (filters.priority.length > 0)
    result = result.filter((i) => i.priority != null && filters.priority.includes(i.priority))
  if (filters.checked !== 'all')
    result = result.filter((i) => filters.checked === 'checked' ? i.checked : !i.checked)
  if (filters.tags.length > 0)
    result = result.filter((i) => i.tags.some((t) => filters.tags.includes(t)))
  if (filters.dateRange !== 'all')
    result = result.filter((i) => isWithinRange(i.createdAt, filters.dateRange as 'today' | 'week' | 'month'))
  return result
}

function applySorting(items: Item[], sort: ColumnSort): Item[] {
  if (sort.field === 'default') return items
  const dir = sort.direction === 'asc' ? 1 : -1
  return items.slice().sort((a, b) => {
    switch (sort.field) {
      case 'priority':
        return dir * ((PRIORITY_ORDER[a.priority ?? ''] ?? 4) - (PRIORITY_ORDER[b.priority ?? ''] ?? 4))
      case 'date':
        return dir * ((a.createdAt ?? 0) - (b.createdAt ?? 0))
      case 'checked':
        return dir * (Number(a.checked) - Number(b.checked))
      case 'alpha':
        return dir * a.text.localeCompare(b.text)
      default:
        return 0
    }
  })
}

interface UseBoardLogicParams {
  sections: Section[]
  search: string
  filters: BoardFilters
}

export function useBoardLogic({ sections, search, filters }: UseBoardLogicParams) {
  const [sortStates, setSortStates] = useState<Record<string, ColumnSort>>({})
  // Preserve stable ordering per section when default sort is active (unchecked-first)
  const lastSortedOrders = useRef<Record<string, string[]>>({})

  const setSortState = useCallback((sectionId: string, sort: ColumnSort) => {
    setSortStates((prev) => ({ ...prev, [sectionId]: sort }))
  }, [])

  const matchesSearch = useCallback(
    (item: Item) => !search || item.text.toLowerCase().includes(search.toLowerCase()),
    [search]
  )

  const processItems = useCallback(
    (section: Section): Item[] => {
      const sort = sortStates[section.id] ?? { field: 'default', direction: 'asc' }

      // Filter by search
      let items = section.items.filter((i) => matchesSearch(i))

      // Apply board-level filters
      items = applyFilters(items, filters)

      // Apply explicit sort
      if (sort.field !== 'default') {
        return applySorting(items, sort)
      }

      // Default sort: unchecked first with stable ordering
      const hasUnchecked = items.some((i) => !i.checked)
      if (hasUnchecked) {
        const sorted = items.slice().sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? 1 : -1))
        lastSortedOrders.current[section.id] = sorted.map((i) => i.id)
        return sorted
      }
      const lastOrder = lastSortedOrders.current[section.id]
      if (lastOrder && lastOrder.length > 0) {
        const pos = new Map(lastOrder.map((id, idx) => [id, idx]))
        return items.slice().sort((a, b) => (pos.get(a.id) ?? 999) - (pos.get(b.id) ?? 999))
      }
      return items
    },
    [sortStates, matchesSearch, filters]
  )

  return { sortStates, setSortState, processItems, matchesSearch }
}
