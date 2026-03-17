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
  { label: 'Default',  value: '',        lightBg: '#e8e4dd', darkBg: '#2a2a2a' },
  { label: 'Stone',    value: '#e7e5e4', lightBg: '#e7e5e4', darkBg: '#292524' },
  { label: 'Red',      value: '#fecaca', lightBg: '#fecaca', darkBg: '#451a1a' },
  { label: 'Orange',   value: '#fed7aa', lightBg: '#fed7aa', darkBg: '#431a07' },
  { label: 'Amber',    value: '#fde68a', lightBg: '#fde68a', darkBg: '#422006' },
  { label: 'Yellow',   value: '#fef08a', lightBg: '#fef08a', darkBg: '#3f3f00' },
  { label: 'Lime',     value: '#d9f99d', lightBg: '#d9f99d', darkBg: '#1a3300' },
  { label: 'Green',    value: '#bbf7d0', lightBg: '#bbf7d0', darkBg: '#14392a' },
  { label: 'Teal',     value: '#99f6e4', lightBg: '#99f6e4', darkBg: '#0d3d3d' },
  { label: 'Cyan',     value: '#a5f3fc', lightBg: '#a5f3fc', darkBg: '#083b4a' },
  { label: 'Sky',      value: '#bae6fd', lightBg: '#bae6fd', darkBg: '#0c3a5a' },
  { label: 'Blue',     value: '#bfdbfe', lightBg: '#bfdbfe', darkBg: '#1e2a4a' },
  { label: 'Indigo',   value: '#c7d2fe', lightBg: '#c7d2fe', darkBg: '#272050' },
  { label: 'Purple',   value: '#ddd6fe', lightBg: '#ddd6fe', darkBg: '#2e1a50' },
  { label: 'Pink',     value: '#fbcfe8', lightBg: '#fbcfe8', darkBg: '#4a1a35' },
  { label: 'Rose',     value: '#fecdd3', lightBg: '#fecdd3', darkBg: '#4a1a1e' },
] as const
