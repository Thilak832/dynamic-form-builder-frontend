import { DragDropContext } from '@hello-pangea/dnd'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formsApi } from '../api'
import { errorMessage } from '../api/client'
import { PreviewModal, PublishModal, SettingsModal, ShareModal, VersionsModal } from '../components/builder/BuilderModals'
import Canvas from '../components/builder/Canvas'
import FieldPalette from '../components/builder/FieldPalette'
import PageTabs from '../components/builder/PageTabs'
import PropertiesPanel from '../components/builder/PropertiesPanel'
import { PageSpinner, Spinner, StatusBadge } from '../components/ui'
import { builder, serializeForm } from '../store/builderSlice'
import { toast } from '../store/uiSlice'

export default function Builder() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { form, dirty, history, selectedKey, pageIndex } = useSelector((s) => s.builder)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(null) // settings | share | versions | preview | publish
  const [mobilePane, setMobilePane] = useState('canvas') // palette | canvas | properties

  useEffect(() => {
    formsApi.get(id).then((f) => dispatch(builder.loadForm(f))).catch((err) => setLoadError(errorMessage(err)))
    return () => { dispatch(builder.closeBuilder()) }
  }, [id, dispatch])

  const canEdit = form?.can_edit !== false

  const save = useCallback(async () => {
    if (!form || !canEdit) return
    setSaving(true)
    try {
      const saved = await formsApi.update(form.id, serializeForm(form))
      dispatch(builder.markSaved(saved))
      dispatch(toast.success('Draft saved'))
    } catch (err) {
      dispatch(toast.error(errorMessage(err, 'Save failed')))
    } finally {
      setSaving(false)
    }
  }, [form, canEdit, dispatch])

  // Ctrl/Cmd+S saves, Ctrl/Cmd+Z undoes (outside text inputs)
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === 's') { e.preventDefault(); save() }
      if (e.key === 'z' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) {
        e.preventDefault()
        dispatch(builder.undo())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save, dispatch])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return undefined
    const onUnload = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [dirty])

  // On small screens, jump to the properties pane when a field is selected
  useEffect(() => {
    if (selectedKey && window.innerWidth < 1024) setMobilePane('properties')
  }, [selectedKey])

  const onDragEnd = ({ source, destination, draggableId }) => {
    if (!destination || !canEdit) return
    if (destination.droppableId.startsWith('page:')) {
      if (source.droppableId === 'canvas') dispatch(builder.moveFieldToPage({ key: draggableId, pageIndex: Number(destination.droppableId.split(':')[1]) }))
      return
    }
    if (destination.droppableId !== 'canvas') return
    if (source.droppableId === 'palette') dispatch(builder.addField({ type: draggableId.replace('palette:', ''), index: destination.index }))
    else dispatch(builder.reorderField({ from: source.index, to: destination.index }))
  }

  const addFromPalette = (type) => {
    if (!canEdit) return
    dispatch(builder.addField({ type }))
    if (window.innerWidth < 1024) setMobilePane('canvas')
  }

  const leave = () => {
    if (dirty && !window.confirm('You have unsaved changes. Leave anyway?')) return
    navigate('/')
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-slate-600">{loadError}</p>
        <Link to="/" className="btn-primary">Back to forms</Link>
      </div>
    )
  }
  if (!form) return <PageSpinner />

  const draftSchema = serializeForm(form)
  const totalFields = form.pages.reduce((n, p) => n + p.fields.length, 0)

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      {/* Top bar */}
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <button className="btn-ghost btn-sm" onClick={leave} aria-label="Back to forms">←</button>
        <input
          className="min-w-0 flex-1 rounded border-0 bg-transparent px-1 py-1 text-base font-semibold focus:bg-slate-50 focus:outline-none focus:ring-0 sm:max-w-xs"
          value={form.name}
          onChange={(e) => dispatch(builder.setMeta({ name: e.target.value }))}
          aria-label="Form name"
          disabled={!canEdit}
        />
        <StatusBadge status={form.status} />
        {form.version > 0 && <span className="hidden text-xs text-slate-500 sm:inline">v{form.version} live{form.has_unpublished_changes || dirty ? ' · draft has changes' : ''}</span>}
        <span className="text-xs text-slate-400">{dirty ? '● Unsaved' : '✓ Saved'}</span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button className="btn-ghost btn-sm" onClick={() => dispatch(builder.undo())} disabled={!history.length} title="Undo (Ctrl+Z)">↶ Undo</button>
          <button className="btn-ghost btn-sm" onClick={() => setModal('settings')}>⚙ Settings</button>
          <button className="btn-ghost btn-sm" onClick={() => setModal('versions')}>🕘 Versions</button>
          <button className="btn-ghost btn-sm" onClick={() => setModal('preview')}>👁 Preview</button>
          <button className="btn-ghost btn-sm" onClick={() => setModal('share')}>🔗 Share</button>
          {canEdit && (
            <>
              <button className="btn-secondary btn-sm" onClick={save} disabled={saving || !dirty}>{saving && <Spinner className="h-3 w-3" />} Save</button>
              <button className="btn-primary btn-sm" onClick={() => setModal('publish')}>Publish</button>
            </>
          )}
        </div>
      </header>
      {!canEdit && <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">You have view-only access to this form. Changes can't be saved.</div>}

      <DragDropContext onDragEnd={onDragEnd}>
        <PageTabs />
        {/* Mobile pane switcher */}
        <div className="flex border-b border-slate-200 bg-white lg:hidden">
          {[['palette', '＋ Fields'], ['canvas', `Canvas (${form.pages[pageIndex].fields.length})`], ['properties', 'Properties']].map(([pane, label]) => (
            <button key={pane} onClick={() => setMobilePane(pane)}
              className={`flex-1 border-b-2 py-2 text-sm font-medium ${mobilePane === pane ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500'}`}>{label}</button>
          ))}
        </div>
        <div className="flex min-h-0 flex-1">
          <aside className={`${mobilePane === 'palette' ? 'flex' : 'hidden'} w-full flex-col border-r border-slate-200 bg-slate-50 lg:flex lg:w-60`}>
            <FieldPalette onAdd={addFromPalette} disabled={!canEdit} />
          </aside>
          <main className={`${mobilePane === 'canvas' ? 'block' : 'hidden'} min-w-0 flex-1 overflow-y-auto p-4 lg:block lg:p-8`}>
            <Canvas />
            <p className="mt-6 text-center text-xs text-slate-400">{form.pages.length} page(s) · {totalFields} field(s) · drag a field onto a page tab to move it</p>
          </main>
          <aside className={`${mobilePane === 'properties' ? 'block' : 'hidden'} w-full overflow-y-auto border-l border-slate-200 bg-white lg:block lg:w-80`}>
            <PropertiesPanel />
          </aside>
        </div>
      </DragDropContext>

      <SettingsModal open={modal === 'settings'} onClose={() => setModal(null)} />
      <ShareModal open={modal === 'share'} onClose={() => setModal(null)} form={form} />
      <VersionsModal open={modal === 'versions'} onClose={() => setModal(null)} formId={form.id} canEdit={canEdit}
        onRestored={(f) => dispatch(builder.loadForm({ ...f, can_edit: form.can_edit }))} />
      <PreviewModal open={modal === 'preview'} onClose={() => setModal(null)} schema={draftSchema} title="Preview (draft)" />
      <PublishModal open={modal === 'publish'} onClose={() => setModal(null)} form={form} onPublished={() => setModal('share')} />
    </div>
  )
}
