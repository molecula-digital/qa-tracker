import { useState } from 'react'
import { useTracker } from './hooks/useTracker'
import { StatsBar } from './components/StatsBar'
import { Toolbar } from './components/Toolbar'
import { SectionCard } from './components/SectionCard'
import { ConfirmModal } from './components/ConfirmModal'
import { SuccessModal } from './components/SuccessModal'
import { TagPicker } from './components/TagPicker'
import { ChecklistIcon } from './components/Icons'
import type { Item, TagKey } from './types/tracker'

type ConfirmState = { title: string; body: string; onConfirm: () => void } | null
type SuccessState = { title: string; body: string } | null
type TagPickerState = { item: Item; sectionId: string; anchorEl: HTMLButtonElement } | null

export default function App() {
  const { data, search, setSearch, actions } = useTracker()
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [successState, setSuccessState] = useState<SuccessState>(null)
  const [tagPickerState, setTagPickerState] = useState<TagPickerState>(null)

  // Derived stats
  const allItems = data.sections.flatMap((s) => s.items)
  const passed = allItems.filter((i) => i.checked).length
  const stats = {
    total: allItems.length,
    passed,
    pending: allItems.length - passed,
    sections: data.sections.length,
  }

  // Handle export
  const handleExport = () => {
    const result = actions.exportJSON()
    setSuccessState({
      title: 'Export complete',
      body: `Saved ${result.sections} section(s) and ${result.total} test item(s) to JSON.`,
    })
  }

  // Handle import
  const handleImport = (file: File) => {
    actions.importJSON(file).catch((err: Error) => {
      setConfirmState({
        title: 'Import failed',
        body: err.message,
        onConfirm: () => setConfirmState(null),
      })
    })
  }

  // Resolve live item for TagPicker (avoids stale tag state)
  const liveTagPickerItem = tagPickerState
    ? data.sections
        .find((s) => s.id === tagPickerState.sectionId)
        ?.items.find((i) => i.id === tagPickerState.item.id) ?? null
    : null

  const handleToggleTag = (tag: TagKey) => {
    if (!tagPickerState || !liveTagPickerItem) return
    if (liveTagPickerItem.tags.includes(tag)) {
      actions.removeTag(tagPickerState.sectionId, liveTagPickerItem.id, tag)
    } else {
      actions.addTag(tagPickerState.sectionId, liveTagPickerItem.id, tag)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f3', padding: '48px 16px 80px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Centered header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#7a8c5c', fontSize: 22 }}>
              <ChecklistIcon />
            </span>
            <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, fontWeight: 600, color: '#3a3228', margin: 0 }}>
              Release Tracker
            </h1>
          </div>
        </div>

        <StatsBar {...stats} onClearAll={actions.clearAllChecked} />

        <Toolbar
          search={search}
          onSearchChange={setSearch}
          onAddSection={actions.addSection}
          onExport={handleExport}
          onImport={handleImport}
        />

        {/* Sections list */}
        {data.sections.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.sections.map((sec) => (
              <SectionCard
                key={sec.id}
                section={sec}
                search={search}
                onToggle={() => actions.toggleSection(sec.id)}
                onTitleChange={(title) => actions.updateSectionTitle(sec.id, title)}
                onDelete={() =>
                  setConfirmState({
                    title: 'Delete section',
                    body: `Delete "${sec.title}" and all its ${sec.items.length} item(s)? This cannot be undone.`,
                    onConfirm: () => {
                      actions.deleteSection(sec.id)
                      setConfirmState(null)
                    },
                  })
                }
                onAddItem={(text) => actions.addItem(sec.id, text)}
                onDeleteItem={(itemId) => {
                  const item = sec.items.find((i) => i.id === itemId)!
                  setConfirmState({
                    title: 'Delete item',
                    body: `"${item.text}" will be permanently removed.`,
                    onConfirm: () => {
                      actions.deleteItem(sec.id, itemId)
                      setConfirmState(null)
                    },
                  })
                }}
                onToggleItem={(itemId) => actions.toggleItem(sec.id, itemId)}
                onUpdateItemText={(itemId, text) => actions.updateItemText(sec.id, itemId, text)}
                onAddTag={(itemId, tag) => actions.addTag(sec.id, itemId, tag)}
                onRemoveTag={(itemId, tag) => actions.removeTag(sec.id, itemId, tag)}
                onAddNote={(itemId, text) => actions.addNote(sec.id, itemId, text)}
                onDeleteNote={(itemId, noteId) => actions.deleteNote(sec.id, itemId, noteId)}
                onOpenTagPicker={(anchorEl, item) =>
                  setTagPickerState({ item, sectionId: sec.id, anchorEl })
                }
                onColorChange={(color) => actions.updateSectionColor(sec.id, color)}
                onIconChange={(icon) => actions.updateSectionIcon(sec.id, icon)}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#8a7d6e', fontSize: 14 }}>
            No sections yet. Click <strong style={{ color: '#3a3228' }}>"Add section"</strong> to get started.
          </div>
        )}
      </div>

      {/* Portals */}
      {tagPickerState && liveTagPickerItem && (
        <TagPicker
          item={liveTagPickerItem}
          anchorEl={tagPickerState.anchorEl}
          onToggleTag={handleToggleTag}
          onClose={() => setTagPickerState(null)}
        />
      )}

      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          body={confirmState.body}
          onConfirm={confirmState.onConfirm}
          onClose={() => setConfirmState(null)}
          confirmLabel={confirmState.title === 'Import failed' ? 'Close' : 'Delete'}
          hideCancel={confirmState.title === 'Import failed'}
        />
      )}

      {successState && (
        <SuccessModal
          title={successState.title}
          body={successState.body}
          onClose={() => setSuccessState(null)}
        />
      )}
    </div>
  )
}
