export type TagKey = 'bug' | 'question' | 'later'

export type PriorityKey = 'low' | 'medium' | 'high' | 'urgent'

export interface Note {
  id: string
  text: string
  ts: number
}

export interface ItemAssignee {
  id: string
  name: string
  image: string | null
}

export interface Item {
  id: string
  text: string
  checked: boolean
  tags: TagKey[]
  notes: Note[]
  priority: PriorityKey | null
  assignees: ItemAssignee[]
  createdAt?: number
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
