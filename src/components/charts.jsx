import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// Reference palette (validated categorical order): slot 1 blue, slot 2 orange.
export const SERIES = ['#2a78d6', '#eb6834']
const GRID = '#e1e0d9'
const AXIS = '#c3c2b7'
const MUTED = '#898781'

const shortDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function TooltipBox({ active, payload, label, labelFormatter, valueFormatter = (v) => v }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-slate-900">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-slate-600">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          {p.name}: <span className="font-semibold tabular-nums text-slate-900">{valueFormatter(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export function ChartCard({ title, subtitle, children, table }) {
  return (
    <section className="card viz p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
      {table && (
        <details className="mt-2 text-xs text-slate-500">
          <summary className="cursor-pointer">View as table</summary>
          <table className="mt-2 w-full tabular-nums">
            <thead><tr>{table.columns.map((c) => <th key={c} className="py-1 text-left font-medium">{c}</th>)}</tr></thead>
            <tbody>{table.rows.map((r, i) => <tr key={i} className="border-t border-slate-100">{r.map((v, j) => <td key={j} className="py-1">{v}</td>)}</tr>)}</tbody>
          </table>
        </details>
      )}
    </section>
  )
}

/** Two series over time (started vs submitted). One y-axis, 2px lines, crosshair tooltip. */
export function DailyLineChart({ data, series }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} stroke={AXIS} tickLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} stroke={AXIS} tickLine={false} axisLine={false} />
          <Tooltip content={<TooltipBox labelFormatter={shortDate} />} cursor={{ stroke: AXIS, strokeWidth: 1 }} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: '#52514e' }} />
          {series.map((s, i) => (
            <Line key={s.key} type="linear" dataKey={s.key} name={s.label} stroke={SERIES[i]} strokeWidth={2}
              dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fcfcfb' }} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Single-series horizontal bars (magnitude by category), value labels at the bar end. */
export function HBarChart({ data, dataKey, nameKey, name, valueFormatter = (v) => v, height }) {
  const h = height || Math.max(120, data.length * 36 + 16)
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }} barCategoryGap={6}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey={nameKey} width={120} stroke={AXIS} tickLine={false} axisLine={false}
            tick={{ fontSize: 11, fill: MUTED }} tickFormatter={(v) => (String(v).length > 18 ? `${String(v).slice(0, 17)}…` : v)} />
          <Tooltip content={<TooltipBox valueFormatter={valueFormatter} />} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
          <Bar dataKey={dataKey} name={name} fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
            <LabelList dataKey={dataKey} position="right" formatter={valueFormatter} style={{ fontSize: 11, fill: '#52514e' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Compact vertical bars for a daily count series. */
export function DailyBarChart({ data, dataKey, name }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barCategoryGap={2}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} stroke={AXIS} tickLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} stroke={AXIS} tickLine={false} axisLine={false} />
          <Tooltip content={<TooltipBox labelFormatter={shortDate} />} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
          <Bar dataKey={dataKey} name={name} fill={SERIES[0]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
