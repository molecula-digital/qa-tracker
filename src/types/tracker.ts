export type TagKey = 'bug' | 'question' | 'later'

export interface Note {
  id: string
  text: string
  ts: number
}

export interface Item {
  id: string
  text: string
  checked: boolean
  tags: TagKey[]
  notes: Note[]
}

export interface Section {
  id: string
  title: string
  items: Item[]
  open: boolean
  color?: string
  icon?: string
}

export interface TrackerData {
  sections: Section[]
}
