import debounce from 'lodash/debounce'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { adminApi } from '../api'
import { errorMessage } from '../api/client'
import { ChartCard, DailyBarChart, HBarChart } from '../components/charts'
import { PageSpinner, Pagination, Spinner, StatTile, StatusBadge, Tabs } from '../components/ui'
import { formatDate, formatMoney } from '../lib/format'
import { toast } from '../store/uiSlice'

function Overview() {
  const dispatch = useDispatch()
  const [a, setA] = useState(null)
  useEffect(() => { adminApi.analytics().then(setA).catch((err) => dispatch(toast.error(errorMessage(err)))) }, [dispatch])
  if (!a) return <PageSpinner />
  const devices = Object.entries(a.devices).map(([device, count]) => ({ device, count }))
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Users" value={a.users} hint={`${a.active_users} active`} />
        <StatTile label="Forms" value={a.forms} hint={`${a.forms_by_status.PUBLISHED || 0} published`} />
        <StatTile label="Responses" value={a.responses} hint={`${a.responses_by_status.SUBMITTED || 0} submitted`} />
        <StatTile label="Completion rate" value={`${a.completion_rate}%`} />
        <StatTile label="Revenue" value={formatMoney(a.revenue)} />
      </div>
      <ChartCard title="Responses started per day" subtitle="All forms, last 30 days"
        table={{ columns: ['Date', 'Responses'], rows: a.daily_responses.filter((d) => d.count).map((d) => [d.date, d.count]) }}>
        <DailyBarChart data={a.daily_responses} dataKey="count" name="Responses" />
      </ChartCard>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Top forms" subtitle="By number of responses">
          <HBarChart data={a.top_forms} dataKey="responses" nameKey="name" name="Responses" />
        </ChartCard>
        <ChartCard title="Devices" subtitle="All responses">
          <HBarChart data={devices} dataKey="count" nameKey="device" name="Responses" />
        </ChartCard>
      </div>
    </div>
  )
}

function Users() {
  const me = useSelector((s) => s.auth.user)
  const dispatch = useDispatch()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const load = useCallback(() => {
    adminApi.users({ q: q || undefined, page, page_size: 25 }).then(setData).catch((err) => dispatch(toast.error(errorMessage(err))))
  }, [q, page, dispatch])
  useEffect(() => { load() }, [load])
  const search = useMemo(() => debounce((v) => { setQ(v); setPage(1) }, 350), [])

  const update = async (user, patch) => {
    try {
      await adminApi.updateUser(user.id, patch)
      dispatch(toast.success(`Updated ${user.email}`))
      load()
    } catch (err) {
      dispatch(toast.error(errorMessage(err)))
    }
  }

  return (
    <div className="space-y-3">
      <input className="input sm:w-72" placeholder="Search users..." onChange={(e) => search(e.target.value)} aria-label="Search users" />
      {!data ? <Spinner /> : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Forms</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Active</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3"><p className="font-medium">{u.full_name}</p><p className="text-xs text-slate-500">{u.email}</p></td>
                  <td className="px-4 py-3">
                    <select className="input w-auto py-1" value={u.role} disabled={u.id === me.id} onChange={(e) => update(u, { role: e.target.value })} aria-label={`Role for ${u.email}`}>
                      <option value="CUSTOMER">Customer</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{u.forms}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={u.is_active} disabled={u.id === me.id}
                      onChange={(e) => update(u, { is_active: e.target.checked })} aria-label={`Active: ${u.email}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={page} pageSize={25} total={data.total} onChange={setPage} />}
    </div>
  )
}

function AllForms() {
  const dispatch = useDispatch()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  useEffect(() => {
    adminApi.forms({ q: q || undefined, page, page_size: 25 }).then(setData).catch((err) => dispatch(toast.error(errorMessage(err))))
  }, [q, page, dispatch])
  const search = useMemo(() => debounce((v) => { setQ(v); setPage(1) }, 350), [])

  return (
    <div className="space-y-3">
      <input className="input sm:w-72" placeholder="Search forms..." onChange={(e) => search(e.target.value)} aria-label="Search forms" />
      {!data ? <Spinner /> : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Form</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Version</th><th className="px-4 py-3">Responses</th><th className="px-4 py-3">Updated</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3 text-slate-600">{f.owner.full_name}</td>
                  <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                  <td className="px-4 py-3 tabular-nums">v{f.version}</td>
                  <td className="px-4 py-3 tabular-nums">{f.responses}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(f.updated_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link className="text-brand-600 hover:underline" to={`/forms/${f.id}/responses`}>Responses</Link>
                    <Link className="ml-3 text-brand-600 hover:underline" to={`/forms/${f.id}/builder`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={page} pageSize={25} total={data.total} onChange={setPage} />}
    </div>
  )
}

const ACTION_LABELS = {
  create_form: 'created form', update_form: 'edited form', publish_form: 'published form', delete_form: 'deleted form',
  archive_form: 'archived form', unarchive_form: 'restored form', duplicate_form: 'duplicated a form', create_from_template: 'created a form from template',
  restore_version: 'restored a version of form', export_responses: 'exported responses of form', delete_response: 'deleted a response',
  login: 'logged in', logout: 'logged out', register: 'registered', reset_password: 'reset their password', update_user: 'updated user',
}

function Activity() {
  const dispatch = useDispatch()
  const [items, setItems] = useState(null)
  useEffect(() => { adminApi.activity(150).then(setItems).catch((err) => dispatch(toast.error(errorMessage(err)))) }, [dispatch])
  if (!items) return <Spinner />
  return (
    <ol className="card divide-y divide-slate-100">
      {items.map((a) => (
        <li key={a.id} className="flex flex-wrap items-baseline gap-x-2 px-4 py-2.5 text-sm">
          <span className="font-medium">{a.user?.full_name || 'Someone'}</span>
          <span className="text-slate-600">{ACTION_LABELS[a.action] || a.action}</span>
          {a.details?.name && <span className="font-medium">"{a.details.name}"</span>}
          {a.details?.version && <span className="text-slate-500">v{a.details.version}</span>}
          {a.details?.format && <span className="text-slate-500">as {a.details.format.toUpperCase()}</span>}
          <span className="ml-auto text-xs text-slate-400">{formatDate(a.created_at, true)}</span>
        </li>
      ))}
      {!items.length && <li className="px-4 py-6 text-center text-sm text-slate-500">No activity yet.</li>}
    </ol>
  )
}

export default function Admin() {
  const [tab, setTab] = useState('overview')
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'overview', label: 'Overview' }, { value: 'users', label: 'Users' },
        { value: 'forms', label: 'All forms' }, { value: 'activity', label: 'Activity' },
      ]} />
      {tab === 'overview' && <Overview />}
      {tab === 'users' && <Users />}
      {tab === 'forms' && <AllForms />}
      {tab === 'activity' && <Activity />}
    </div>
  )
}
