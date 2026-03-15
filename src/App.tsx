import { useState } from 'react'
import { useTracker } from './hooks/useTracker'
import { Toolbar } from './components/Toolbar'
import { KanbanBoard } from './components/KanbanBoard'
import { ConfirmModal } from './components/ConfirmModal'
import { SuccessModal } from './components/SuccessModal'
import { StatsModal } from './components/StatsModal'
import { TagPicker } from './components/TagPicker'
import { ChecklistIcon } from './components/Icons'
import type { Item, TagKey } from './types/tracker'

type ConfirmState = { title: string; body: string; onConfirm: () => void } | null
type SuccessState = { title: string; body: string } | null
type TagPickerState = { item: Item; sectionId: string; anchorEl: HTMLButtonElement } | null

const ENV_LINKS = [
  { label: 'Dev', url: 'https://beta.app.sofinanzas.mx', bg: '#fef9ec', color: '#92600a', border: '#f5c842' },
  { label: 'Prod', url: 'https://app.sofinanzas.mx',     bg: '#edf7f0', color: '#1a6b3a', border: '#5cb87a' },
]

export default function App() {
  const { data, search, setSearch, actions } = useTracker()
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [successState, setSuccessState] = useState<SuccessState>(null)
  const [tagPickerState, setTagPickerState] = useState<TagPickerState>(null)
  const [showStats, setShowStats] = useState(false)
  const [newestSectionId, setNewestSectionId] = useState<string | null>(null)

  const allItems = data.sections.flatMap((s) => s.items)
  const passed = allItems.filter((i) => i.checked).length
  const stats = {
    total: allItems.length,
    passed,
    pending: allItems.length - passed,
    sections: data.sections.length,
  }

  const handleDeleteSection = (sectionId: string) => {
    const sec = data.sections.find((s) => s.id === sectionId)!
    setConfirmState({
      title: 'Delete section',
      body: `Delete "${sec.title}" and all its ${sec.items.length} item(s)? This cannot be undone.`,
      onConfirm: () => { actions.deleteSection(sectionId); setConfirmState(null) },
    })
  }

  const handleDeleteItem = (sectionId: string, itemId: string) => {
    const sec = data.sections.find((s) => s.id === sectionId)!
    const item = sec.items.find((i) => i.id === itemId)!
    setConfirmState({
      title: 'Delete item',
      body: `"${item.text}" will be permanently removed.`,
      onConfirm: () => { actions.deleteItem(sectionId, itemId); setConfirmState(null) },
    })
  }

  const handleExport = () => {
    const result = actions.exportJSON()
    setSuccessState({
      title: 'Export complete',
      body: `Saved ${result.sections} section(s) and ${result.total} test item(s) to JSON.`,
    })
  }

  const handleImport = (file: File) => {
    actions.importJSON(file).catch((err: Error) => {
      setConfirmState({
        title: 'Import failed',
        body: err.message,
        onConfirm: () => setConfirmState(null),
      })
    })
  }

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

  const statsSummary = stats.total ? `${stats.passed}/${stats.total}` : 'Stats'

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f3', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ddd5c2', padding: '0 20px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#7a8c5c', fontSize: 18, display: 'flex' }}><ChecklistIcon /></span>
          <span style={{ fontFamily: "'Bricolage Grotesque', Georgia, serif", fontSize: 18, fontWeight: 700, color: '#3a3228', letterSpacing: '-0.02em' }}>
            Release Tracker
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {ENV_LINKS.map(({ label, url, bg, color, border }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                background: bg, color, border: `1px solid ${border}`,
                textDecoration: 'none', fontFamily: 'inherit',
              }}
            >
              {label}
              <span style={{ fontSize: 10, opacity: 0.7 }}>↗</span>
            </a>
          ))}
        </div>
      </div>

      {/* Board toolbar */}
      <div style={{ background: '#f2ede3', borderBottom: '1px solid #ddd5c2', padding: '10px 20px', flexShrink: 0 }}>
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          onAddSection={() => actions.addSection((id) => {
            setNewestSectionId(id)
            setTimeout(() => setNewestSectionId(null), 1500)
          })}
          onExport={handleExport}
          onImport={handleImport}
          onShowStats={() => setShowStats(true)}
          statsSummary={statsSummary}
        />
      </div>

      {/* Board */}
      <div style={{ flex: 1, padding: '20px 20px 40px', overflowX: 'hidden' }}>
        {data.sections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#8a7d6e', fontSize: 14 }}>
            No columns yet. Click <strong style={{ color: '#3a3228' }}>"Add section"</strong> to get started.
          </div>
        ) : (
          <KanbanBoard
            sections={data.sections}
            search={search}
            newestSectionId={newestSectionId}
            onToggleItem={actions.toggleItem}
            onAddItem={actions.addItem}
            onDeleteItem={handleDeleteItem}
            onAddNote={actions.addNote}
            onDeleteNote={actions.deleteNote}
            onDeleteSection={handleDeleteSection}
            onUpdateSectionTitle={actions.updateSectionTitle}
            onColorChange={actions.updateSectionColor}
            onIconChange={actions.updateSectionIcon}
            onReorder={actions.reorderSections}
            onOpenTagPicker={(anchorEl, item, sectionId) =>
              setTagPickerState({ item, sectionId, anchorEl })
            }
          />
        )}
      </div>

      {tagPickerState && liveTagPickerItem && (
        <TagPicker
          item={liveTagPickerItem}
          anchorEl={tagPickerState.anchorEl}
          onToggleTag={handleToggleTag}
          onClose={() => setTagPickerState(null)}
        />
      )}

      {showStats && (
        <StatsModal
          {...stats}
          onClearAll={actions.clearAllChecked}
          onClose={() => setShowStats(false)}
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
