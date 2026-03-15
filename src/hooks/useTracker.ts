import { useState } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { TrackerData, Section, Item, TagKey, Note } from '../types/tracker'

const uid = () => 'id' + (Date.now() % 1e9) + ((Math.random() * 1e4) | 0)

const DEFAULT_DATA: TrackerData = { sections: [] }

// Immutable helpers
function mapSection(
  data: TrackerData,
  sectionId: string,
  fn: (s: Section) => Section,
): TrackerData {
  return {
    ...data,
    sections: data.sections.map((s) => (s.id === sectionId ? fn(s) : s)),
  }
}

function mapItem(
  data: TrackerData,
  sectionId: string,
  itemId: string,
  fn: (i: Item) => Item,
): TrackerData {
  return mapSection(data, sectionId, (sec) => ({
    ...sec,
    items: sec.items.map((i) => (i.id === itemId ? fn(i) : i)),
  }))
}

export function useTracker() {
  const [data, setData] = useLocalStorage<TrackerData>('release_tracker_v1', DEFAULT_DATA)
  const [search, setSearch] = useState('')

  const actions = {
    addSection: (onCreated?: (id: string) => void) => {
      const sec: Section = { id: uid(), title: 'New section', items: [], open: true }
      setData((prev) => ({ ...prev, sections: [sec, ...prev.sections] }))
      onCreated?.(sec.id)
    },

    deleteSection: (sectionId: string) => {
      setData((prev) => ({
        ...prev,
        sections: prev.sections.filter((s) => s.id !== sectionId),
      }))
    },

    updateSectionTitle: (sectionId: string, title: string) => {
      setData((prev) => mapSection(prev, sectionId, (s) => ({ ...s, title })))
    },

    toggleSection: (sectionId: string) => {
      setData((prev) =>
        mapSection(prev, sectionId, (s) => ({ ...s, open: !s.open })),
      )
    },

    addItem: (sectionId: string, text: string) => {
      const item: Item = { id: uid(), text, checked: false, tags: [], notes: [] }
      setData((prev) =>
        mapSection(prev, sectionId, (s) => ({ ...s, items: [...s.items, item] })),
      )
    },

    deleteItem: (sectionId: string, itemId: string) => {
      setData((prev) =>
        mapSection(prev, sectionId, (s) => ({
          ...s,
          items: s.items.filter((i) => i.id !== itemId),
        })),
      )
    },

    toggleItem: (sectionId: string, itemId: string) => {
      setData((prev) =>
        mapItem(prev, sectionId, itemId, (i) => ({ ...i, checked: !i.checked })),
      )
    },

    updateItemText: (sectionId: string, itemId: string, text: string) => {
      setData((prev) => mapItem(prev, sectionId, itemId, (i) => ({ ...i, text })))
    },

    addTag: (sectionId: string, itemId: string, tag: TagKey) => {
      setData((prev) =>
        mapItem(prev, sectionId, itemId, (i) => ({
          ...i,
          tags: i.tags.includes(tag) ? i.tags : [...i.tags, tag],
        })),
      )
    },

    removeTag: (sectionId: string, itemId: string, tag: TagKey) => {
      setData((prev) =>
        mapItem(prev, sectionId, itemId, (i) => ({
          ...i,
          tags: i.tags.filter((t) => t !== tag),
        })),
      )
    },

    addNote: (sectionId: string, itemId: string, text: string) => {
      const note: Note = { id: uid(), text, ts: Date.now() }
      setData((prev) =>
        mapItem(prev, sectionId, itemId, (i) => ({
          ...i,
          notes: [...i.notes, note],
        })),
      )
    },

    deleteNote: (sectionId: string, itemId: string, noteId: string) => {
      setData((prev) =>
        mapItem(prev, sectionId, itemId, (i) => ({
          ...i,
          notes: i.notes.filter((n) => n.id !== noteId),
        })),
      )
    },

    reorderSections: (fromIndex: number, toIndex: number) => {
      setData((prev) => {
        const sections = [...prev.sections]
        const [moved] = sections.splice(fromIndex, 1)
        sections.splice(toIndex, 0, moved)
        return { ...prev, sections }
      })
    },

    updateSectionColor: (sectionId: string, color: string) => {
      setData((prev) => mapSection(prev, sectionId, (s) => ({ ...s, color })))
    },

    updateSectionIcon: (sectionId: string, icon: string) => {
      setData((prev) => mapSection(prev, sectionId, (s) => ({ ...s, icon })))
    },

    clearAllChecked: () => {
      setData((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => ({
          ...s,
          items: s.items.map((i) => ({ ...i, checked: false })),
        })),
      }))
    },

    exportJSON: (): { sections: number; total: number } => {
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `release-tracker-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a) }, 200)
      const total = data.sections.reduce((sum, s) => sum + s.items.length, 0)
      return { sections: data.sections.length, total }
    },

    importJSON: (file: File): Promise<void> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const parsed = JSON.parse(e.target!.result as string) as TrackerData
            if (!parsed || !Array.isArray(parsed.sections)) {
              reject(new Error('Invalid file format: missing sections array'))
              return
            }
            // Normalize for backwards compatibility (same as original)
            parsed.sections.forEach((sec) => {
              if (!sec.id) sec.id = uid()
              sec.items.forEach((it) => {
                if (!it.id) it.id = uid()
                if (!it.tags) it.tags = []
                if (!it.notes) it.notes = []
              })
            })
            setData(parsed)
            resolve()
          } catch {
            reject(new Error('Could not parse JSON file'))
          }
        }
        reader.onerror = () => reject(new Error('Could not read file'))
        reader.readAsText(file)
      })
    },
  }

  return { data, search, setSearch, actions }
}
