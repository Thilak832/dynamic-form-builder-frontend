import debounce from 'lodash/debounce'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useParams } from 'react-router-dom'
import { formsApi, responsesApi } from '../api'
import { downloadFile, errorMessage } from '../api/client'
import { EmptyState, Pagination, Spinner, StatusBadge, Tabs } from '../components/ui'
import { formatAnswer, formatBytes, formatDate, formatDuration, formatMoney } from '../lib/format'
import { DISPLAY_ONLY } from '../lib/logic'
import { toast } from '../store/uiSlice'

const PAGE_SIZE = 20

function Answer({ field, value }) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) {
    return <span className="text-slate-400">-</span>
  }
  if (field.field_type === 'signature' && typeof value === 'string' && value.startsWith('data:image/png;base64,')) {
    return <img src={value} alt="Signature" className="h-20 rounded border border-slate-200 bg-white" />
  }
  if (['file', 'multi_file'].includes(field.field_type) && Array.isArray(value)) {
    return (
      <div className="space-y-1">
        {value.map((f) => (
          <button key={f.file_id} className="flex items-center gap-2 text-sm text-brand-700 hover:underline" onClick={() => downloadFile(`/files/${f.file_id}`, f.name)}>
            📄 {f.name} <span className="text-xs text-slate-500">({formatBytes(f.size)})</span>
          </button>
        ))}
      </div>
    )
  }
  return <span className="whitespace-pre-wrap break-words">{formatAnswer(field, value)}</span>
}

function ResponseDrawer({ formId, responseId, onClose, onDeleted, canEdit }) {
  const dispatch = useDispatch()
  const [data, setData] = useState(null)

  useEffect(() => {
    setData(null)
    responsesApi.get(formId, responseId).then(setData).catch((err) => dispatch(toast.error(errorMessage(err))))
  }, [formId, responseId, dispatch])

  const remove = async () => {
    if (!window.confirm(`Delete response #${responseId}? This also deletes its uploaded files.`)) return
    try {
      await responsesApi.remove(formId, responseId)
      dispatch(toast.success('Response deleted'))
      onDeleted()
    } catch (err) {
      dispatch(toast.error(errorMessage(err)))
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40" onMouseDown={onClose}>
      <aside className="flex h-full w-full max-w-xl flex-col bg-white shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold">Response #{responseId}</h2>
          {data && <StatusBadge status={data.status} />}
          <button className="btn-ghost btn-sm ml-auto" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {!data ? <div className="flex flex-1 items-center justify-center"><Spinner /></div> : (
          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            <dl className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
              <div><dt className="text-xs text-slate-500">Started</dt><dd>{formatDate(data.start_time, true)}</dd></div>
              <div><dt className="text-xs text-slate-500">Submitted</dt><dd>{data.submit_time ? formatDate(data.submit_time, true) : '-'}</dd></div>
              <div><dt className="text-xs text-slate-500">Time to complete</dt><dd>{data.submit_time ? formatDuration((new Date(`${data.submit_time}Z`) - new Date(`${data.start_time}Z`)) / 1000) : '-'}</dd></div>
              <div><dt className="text-xs text-slate-500">Device · version</dt><dd className="capitalize">{data.device_type || '-'} · v{data.form_version}</dd></div>
            </dl>

            {data.payments?.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Payments</h3>
                {data.payments.map((p) => (
                  <div key={p.order_id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <StatusBadge status={p.status} />
                    <span className="font-medium">{formatMoney(p.amount, p.currency)}</span>
                    <span className="font-mono text-xs text-slate-500">{p.payment_id || p.order_id}</span>
                    {p.is_mock && <span className="chip bg-slate-100 text-slate-500">demo</span>}
                  </div>
                ))}
              </section>
            )}

            {data.schema.pages.map((page) => (
              <section key={page.key}>
                <h3 className="mb-2 border-b border-slate-200 pb-1 text-sm font-semibold text-slate-700">{page.title}</h3>
                <dl className="space-y-3">
                  {page.fields.filter((f) => !DISPLAY_ONLY.has(f.field_type)).map((f) => (
                    <div key={f.key} className="grid gap-1 text-sm sm:grid-cols-[180px_1fr]">
                      <dt className="text-slate-500">{f.label}</dt>
                      <dd><Answer field={f} value={data.answers[f.key]} /></dd>
                    </div>
                  ))}
                </dl>
                {data.page_times?.[page.key] && <p className="mt-2 text-xs text-slate-400">Time on page: {formatDuration(data.page_times[page.key])}</p>}
              </section>
            ))}
          </div>
        )}
        {canEdit && data && (
          <div className="border-t border-slate-200 px-5 py-3">
            <button className="btn-ghost btn-sm text-red-600" onClick={remove}>Delete response</button>
          </div>
        )}
      </aside>
    </div>
  )
}

export default function Responses() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const [form, setForm] = useState(null)
  const [filters, setFilters] = useState({ status: '', date_from: '', date_to: '', q: '', sort: '-start_time' })
  const [qInput, setQInput] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)
  const [exporting, setExporting] = useState(null)

  useEffect(() => {
    formsApi.get(id).then(setForm).catch((err) => dispatch(toast.error(errorMessage(err))))
  }, [id, dispatch])

  const params = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), [filters])

  const load = useCallback(() => {
    responsesApi.list(id, { ...params, page, page_size: PAGE_SIZE }).then(setData).catch((err) => dispatch(toast.error(errorMessage(err))))
  }, [id, params, page, dispatch])
  useEffect(() => { load() }, [load])

  const setFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1) }
  const updateQ = useMemo(() => debounce((q) => setFilter({ q }), 350), [])
  useEffect(() => () => updateQ.cancel(), [updateQ])

  const exportAs = async (format) => {
    setExporting(format)
    try {
      const qs = new URLSearchParams({ ...params, format })
      qs.delete('sort')
      await downloadFile(`/forms/${id}/responses/export?${qs}`, `responses.${format}`)
    } catch (err) {
      dispatch(toast.error(errorMessage(err, 'Export failed')))
    } finally {
      setExporting(null)
    }
  }

  const columns = (data?.columns || []).filter((c) => !['signature', 'password', 'rich_text'].includes(c.field_type)).slice(0, 4)
  const fieldByKey = Object.fromEntries((data?.columns || []).map((c) => [c.key, c]))
  const toggleSort = (col) => setFilter({ sort: filters.sort === `-${col}` ? col : `-${col}` })
  const sortMark = (col) => (filters.sort === `-${col}` ? ' ↓' : filters.sort === col ? ' ↑' : '')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">← Forms</Link>
          <h1 className="text-2xl font-semibold">{form?.name || 'Responses'}</h1>
          <p className="text-sm text-slate-500">{data ? `${data.total} response${data.total === 1 ? '' : 's'} match` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/forms/${id}/analytics`} className="btn-secondary">📊 Analytics</Link>
          <button className="btn-secondary" onClick={() => exportAs('csv')} disabled={!!exporting}>{exporting === 'csv' && <Spinner className="h-4 w-4" />} Export CSV</button>
          <button className="btn-primary" onClick={() => exportAs('xlsx')} disabled={!!exporting}>{exporting === 'xlsx' && <Spinner className="h-4 w-4" />} Export Excel</button>
        </div>
      </div>

      <div className="card space-y-3 p-3">
        <Tabs
          value={filters.status}
          onChange={(status) => setFilter({ status })}
          tabs={[{ value: '', label: 'All' }, { value: 'SUBMITTED', label: 'Submitted' }, { value: 'IN_PROGRESS', label: 'In progress' }, { value: 'ABANDONED', label: 'Abandoned' }]}
        />
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <input className="input" placeholder="Search answers (name, email, ...)" value={qInput} onChange={(e) => { setQInput(e.target.value); updateQ(e.target.value) }} aria-label="Search responses" />
          <label className="flex items-center gap-2 text-sm text-slate-500">From <input type="date" className="input" value={filters.date_from} onChange={(e) => setFilter({ date_from: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm text-slate-500">To <input type="date" className="input" value={filters.date_to} onChange={(e) => setFilter({ date_to: e.target.value })} /></label>
          <button className="btn-ghost btn-sm" onClick={() => { setQInput(''); setFilters({ status: '', date_from: '', date_to: '', q: '', sort: '-start_time' }); setPage(1) }}>Reset</button>
        </div>
      </div>

      {!data ? (
        <div className="flex justify-center py-16 text-brand-600"><Spinner className="h-8 w-8" /></div>
      ) : !data.items.length ? (
        <EmptyState icon="📬" title="No responses found">
          {Object.keys(params).length > 1 ? 'Try clearing the filters.' : 'Share the form link to start collecting bookings.'}
        </EmptyState>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort('id')}>#{sortMark('id')}</th>
                  {columns.map((c) => <th key={c.key} className="px-4 py-3">{c.label}</th>)}
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort('start_time')}>Started{sortMark('start_time')}</th>
                  <th className="px-4 py-3">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((r) => (
                  <tr key={r.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelected(r.id)}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.id}</td>
                    {columns.map((c) => (
                      <td key={c.key} className="max-w-[220px] truncate px-4 py-3">{formatAnswer(fieldByKey[c.key], r.answers[c.key]) || <span className="text-slate-300">-</span>}</td>
                    ))}
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">{r.payment_status ? <StatusBadge status={r.payment_status} /> : <span className="text-slate-300">-</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(r.start_time, true)}</td>
                    <td className="px-4 py-3 capitalize text-slate-500">{r.device_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
        </>
      )}

      {selected && (
        <ResponseDrawer
          formId={id}
          responseId={selected}
          canEdit={user.role === 'ADMIN'}
          onClose={() => setSelected(null)}
          onDeleted={() => { setSelected(null); load() }}
        />
      )}
    </div>
  )
}
