import debounce from 'lodash/debounce'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { formsApi } from '../api'
import { errorMessage } from '../api/client'
import { ShareModal } from '../components/builder/BuilderModals'
import { ConfirmDialog, EmptyState, Modal, Pagination, Spinner, StatusBadge, Tabs } from '../components/ui'
import { formatDate } from '../lib/format'
import { createPage } from '../lib/fieldTypes'
import { toast } from '../store/uiSlice'

const PAGE_SIZE = 12

function NewFormModal({ open, onClose }) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [data, setData] = useState({ name: '', description: '' })
  const [busy, setBusy] = useState(false)

  const create = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const form = await formsApi.create({ ...data, pages: [createPage(1)] })
      navigate(`/forms/${form.id}/builder`)
    } catch (err) {
      dispatch(toast.error(errorMessage(err)))
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create a new form">
      <form onSubmit={create} className="space-y-4">
        <div>
          <label className="label" htmlFor="nf-name">Form name</label>
          <input id="nf-name" autoFocus required className="input" placeholder="Honeymoon Package Form" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="nf-desc">Description <span className="font-normal text-slate-400">(optional)</span></label>
          <textarea id="nf-desc" rows={2} className="input" value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/templates" className="text-sm text-brand-600 hover:underline">or start from a template →</Link>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Create & open builder</button>
        </div>
      </form>
    </Modal>
  )
}

function FormCard({ form, canEdit, onAction }) {
  const [menu, setMenu] = useState(false)
  const r = form.responses || { total: 0, submitted: 0 }
  return (
    <div className="card flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <Link to={canEdit ? `/forms/${form.id}/builder` : `/forms/${form.id}/responses`} className="min-w-0">
          <h3 className="truncate font-semibold hover:text-brand-700">{form.name}</h3>
        </Link>
        <StatusBadge status={form.status} />
      </div>
      <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">{form.description || 'No description'}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2 text-center">
        <div><p className="text-lg font-semibold">{r.submitted}</p><p className="text-xs text-slate-500">Submitted</p></div>
        <div><p className="text-lg font-semibold">{r.total}</p><p className="text-xs text-slate-500">Started</p></div>
        <div><p className="text-lg font-semibold">{form.total_pages}</p><p className="text-xs text-slate-500">Pages</p></div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {form.version ? `v${form.version}` : 'Never published'} · updated {formatDate(form.updated_at)}
        {form.version > 0 && form.has_unpublished_changes && <span className="text-amber-600"> · unpublished edits</span>}
        {form.owner && <span> · {form.owner.full_name}</span>}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        {canEdit && <Link to={`/forms/${form.id}/builder`} className="btn-secondary btn-sm">Edit</Link>}
        <Link to={`/forms/${form.id}/responses`} className="btn-secondary btn-sm">Responses</Link>
        <Link to={`/forms/${form.id}/analytics`} className="btn-ghost btn-sm">Analytics</Link>
        <div className="relative ml-auto">
          <button className="btn-ghost btn-sm" onClick={() => setMenu((m) => !m)} aria-label="More actions" aria-expanded={menu}>•••</button>
          {menu && (
            <div className="absolute bottom-full right-0 z-10 mb-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg" onMouseLeave={() => setMenu(false)}>
              {[
                ['share', 'Share / QR code'],
                ...(canEdit ? [['duplicate', 'Duplicate'], form.status === 'ARCHIVED' ? ['unarchive', 'Restore'] : ['archive', 'Archive'], ['delete', 'Delete']] : []),
              ].map(([action, label]) => (
                <button key={action} onClick={() => { setMenu(false); onAction(action, form) }}
                  className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${action === 'delete' ? 'text-red-600' : ''}`}>{label}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const user = useSelector((s) => s.auth.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [newOpen, setNewOpen] = useState(false)
  const [shareForm, setShareForm] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const canBuild = user.role === 'ADMIN'

  const load = useCallback(() => {
    formsApi.list({ page, page_size: PAGE_SIZE, status: status || undefined, q: search || undefined })
      .then(setData)
      .catch((err) => dispatch(toast.error(errorMessage(err))))
  }, [page, status, search, dispatch])

  useEffect(() => { load() }, [load])

  const updateSearch = useMemo(() => debounce((v) => { setSearch(v); setPage(1) }, 350), [])
  useEffect(() => () => updateSearch.cancel(), [updateSearch])

  const onAction = async (action, form) => {
    try {
      if (action === 'share') return setShareForm(form)
      if (action === 'delete') return setToDelete(form)
      if (action === 'duplicate') {
        const copy = await formsApi.duplicate(form.id)
        dispatch(toast.success('Form duplicated'))
        return navigate(`/forms/${copy.id}/builder`)
      }
      if (action === 'archive') await formsApi.archive(form.id)
      if (action === 'unarchive') await formsApi.unarchive(form.id)
      dispatch(toast.success(action === 'archive' ? 'Form archived - it no longer accepts responses' : 'Form restored'))
      load()
    } catch (err) {
      dispatch(toast.error(errorMessage(err)))
    }
    return null
  }

  const confirmDelete = async () => {
    setBusy(true)
    try {
      await formsApi.remove(toDelete.id)
      dispatch(toast.success('Form deleted'))
      setToDelete(null)
      load()
    } catch (err) {
      dispatch(toast.error(errorMessage(err)))
    } finally {
      setBusy(false)
    }
  }

  const totals = data?.items.reduce((acc, f) => ({ submitted: acc.submitted + (f.responses?.submitted || 0), started: acc.started + (f.responses?.total || 0) }), { submitted: 0, started: 0 })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Booking forms</h1>
          <p className="text-sm text-slate-500">
            {data ? `${data.total} form${data.total === 1 ? '' : 's'}` : 'Loading...'}
            {totals && data?.items.length ? ` · ${totals.submitted} submissions on this page` : ''}
          </p>
        </div>
        {canBuild && (
          <div className="flex gap-2">
            <Link to="/templates" className="btn-secondary">Browse templates</Link>
            <button className="btn-primary" onClick={() => setNewOpen(true)}>+ New form</button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs
          value={status}
          onChange={(v) => { setStatus(v); setPage(1) }}
          tabs={[{ value: '', label: 'All' }, { value: 'PUBLISHED', label: 'Published' }, { value: 'DRAFT', label: 'Drafts' }, { value: 'ARCHIVED', label: 'Archived' }]}
        />
        <input className="input sm:w-64" placeholder="Search forms..." value={q} onChange={(e) => { setQ(e.target.value); updateSearch(e.target.value) }} aria-label="Search forms" />
      </div>

      {!data ? (
        <div className="flex justify-center py-16 text-brand-600"><Spinner className="h-8 w-8" /></div>
      ) : !data.items.length ? (
        <EmptyState
          icon="🗺️"
          title={search || status ? 'No forms match your filters' : 'No forms yet'}
          action={canBuild && !search && !status && (
            <div className="flex gap-2">
              <button className="btn-primary" onClick={() => setNewOpen(true)}>Create your first form</button>
              <Link to="/templates" className="btn-secondary">Use a template</Link>
            </div>
          )}
        >
          {!search && !status && 'Build a booking form for a honeymoon, trek, group tour or visa application - no code needed.'}
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((f) => <FormCard key={f.id} form={f} canEdit={canBuild} onAction={onAction} />)}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
        </>
      )}

      <NewFormModal open={newOpen} onClose={() => setNewOpen(false)} />
      {shareForm && <ShareModal open onClose={() => setShareForm(null)} form={shareForm} />}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete form?"
        message={`"${toDelete?.name}" and all of its ${toDelete?.responses?.total || 0} responses and uploaded files will be permanently deleted.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
