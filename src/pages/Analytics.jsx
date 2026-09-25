import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link, useParams } from 'react-router-dom'
import { formsApi, responsesApi } from '../api'
import { errorMessage } from '../api/client'
import { ChartCard, DailyLineChart, HBarChart } from '../components/charts'
import { EmptyState, PageSpinner, StatTile } from '../components/ui'
import { formatDuration, formatMoney } from '../lib/format'
import { toast } from '../store/uiSlice'

export default function Analytics() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const [form, setForm] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    Promise.all([formsApi.get(id), responsesApi.stats(id)])
      .then(([f, s]) => { setForm(f); setStats(s) })
      .catch((err) => dispatch(toast.error(errorMessage(err))))
  }, [id, dispatch])

  if (!stats) return <PageSpinner />

  const funnel = stats.funnel.map((p, i) => ({ ...p, label: `${i + 1}. ${p.page}` }))
  const devices = Object.entries(stats.devices).map(([device, count]) => ({ device: device[0].toUpperCase() + device.slice(1), count })).sort((a, b) => b.count - a.count)
  const fill = stats.fields.map((f) => ({ label: f.label, fill_rate: f.fill_rate }))
  const choiceFields = stats.fields.filter((f) => f.top_choices?.length)
  const pct = (v) => `${v}%`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">← Forms</Link>
          <h1 className="text-2xl font-semibold">{form?.name} · Analytics</h1>
          <p className="text-sm text-slate-500">Responses are marked abandoned after 24 hours of inactivity.</p>
        </div>
        <Link to={`/forms/${id}/responses`} className="btn-secondary">View responses →</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Total responses" value={stats.total_responses} hint={`${stats.in_progress} in progress`} />
        <StatTile label="Completion rate" value={`${stats.completion_rate}%`} hint={`${stats.submitted} submitted`} />
        <StatTile label="Abandonment" value={`${stats.abandonment_rate}%`} hint={`${stats.abandoned} abandoned`} />
        <StatTile label="Avg. time to complete" value={formatDuration(stats.avg_completion_seconds)} />
        <StatTile label="Payments collected" value={formatMoney(stats.payments.collected)} hint={`${stats.payments.count} payments`} />
      </div>

      {stats.total_responses === 0 ? (
        <EmptyState icon="📈" title="No data yet">Charts appear once people start filling the form.</EmptyState>
      ) : (
        <>
          <ChartCard title="Responses over the last 30 days" subtitle="Started vs submitted per day"
            table={{ columns: ['Date', 'Started', 'Submitted'], rows: stats.daily.filter((d) => d.started || d.submitted).map((d) => [d.date, d.started, d.submitted]) }}>
            <DailyLineChart data={stats.daily} series={[{ key: 'started', label: 'Started' }, { key: 'submitted', label: 'Submitted' }]} />
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Abandonment funnel" subtitle="Responses that reached each page"
              table={{ columns: ['Page', 'Reached', 'Avg. time'], rows: funnel.map((p) => [p.label, p.reached, formatDuration(p.avg_seconds)]) }}>
              <HBarChart data={funnel} dataKey="reached" nameKey="label" name="Reached" />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {funnel.map((p) => <span key={p.label}>{p.label}: avg {formatDuration(p.avg_seconds)}</span>)}
              </div>
            </ChartCard>
            <ChartCard title="Devices" subtitle="Share of responses by device type"
              table={{ columns: ['Device', 'Responses'], rows: devices.map((d) => [d.device, d.count]) }}>
              <HBarChart data={devices} dataKey="count" nameKey="device" name="Responses" />
            </ChartCard>
          </div>

          <ChartCard title="Field completion" subtitle="% of submitted responses that answered each field (optional or conditional fields score lower)"
            table={{ columns: ['Field', 'Fill rate'], rows: fill.map((f) => [f.label, pct(f.fill_rate)]) }}>
            <HBarChart data={fill} dataKey="fill_rate" nameKey="label" name="Fill rate" valueFormatter={pct} />
          </ChartCard>

          {choiceFields.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              {choiceFields.map((f) => (
                <ChartCard key={f.key} title={f.label} subtitle="Most popular answers">
                  <HBarChart data={f.top_choices} dataKey="count" nameKey="value" name="Responses" />
                </ChartCard>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
