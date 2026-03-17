import type { TagKey, PriorityKey } from '@/types/tracker'

export const TAG_COLORS: Record<TagKey, string> = {
  bug: '#e05555',
  question: '#d4a020',
  later: '#4a8ae0',
}

export const PRIORITY_COLORS: Record<PriorityKey, string> = {
  urgent: '#e05555',
  high: '#e08a30',
  medium: '#d4a020',
  low: '#8888a0',
}

export const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0, high: 1, medium: 2, low: 3,
}

export const PRIORITY_LABELS: Record<PriorityKey, string> = {
  urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low',
}

export const SECTION_COLORS = [
  { label: 'Default',   value: '',        lightBg: '#e8e4dd', darkBg: '#333' },
  { label: 'Sage',      value: '#e8f0de', lightBg: '#e8f0de', darkBg: '#3a4a2e' },
  { label: 'Sky',       value: '#deeaf5', lightBg: '#deeaf5', darkBg: '#2a3a4a' },
  { label: 'Blush',     value: '#f5e4e4', lightBg: '#f5e4e4', darkBg: '#4a2a2a' },
  { label: 'Lavender',  value: '#ece8f5', lightBg: '#ece8f5', darkBg: '#3a2a4a' },
  { label: 'Peach',     value: '#f5ede0', lightBg: '#f5ede0', darkBg: '#4a3a2a' },
  { label: 'Mint',      value: '#dff5ef', lightBg: '#dff5ef', darkBg: '#2a4a3a' },
  { label: 'Lemon',     value: '#f5f2d0', lightBg: '#f5f2d0', darkBg: '#4a4a2a' },
  { label: 'Slate',     value: '#e2e8f0', lightBg: '#e2e8f0', darkBg: '#2a2e38' },
  { label: 'Rose',      value: '#fce7f3', lightBg: '#fce7f3', darkBg: '#4a2a3a' },
] as const
