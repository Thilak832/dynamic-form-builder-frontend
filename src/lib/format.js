export function formatDate(value, withTime = false) {
  if (!value) return '-'
  // API timestamps are naive UTC
  const d = new Date(typeof value === 'string' && !value.endsWith('Z') && value.includes('T') ? `${value}Z` : value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString(undefined, withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatMoney(amount, currency = 'INR') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount || 0)
  } catch {
    return `${currency} ${amount}`
  }
}

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '-'
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`
}

export function formatBytes(n) {
  if (!n) return '0 B'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function stripTags(html) {
  const div = document.createElement('div')
  div.innerHTML = html || ''
  return div.textContent || ''
}

/** Plain text rendering of an answer for tables and detail views. */
export function formatAnswer(field, value) {
  if (value === null || value === undefined || value === '') return ''
  const type = field?.field_type
  const options = field?.config?.options || []
  const optLabel = (v) => options.find((o) => String(o.value) === String(v))?.label ?? String(v)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  switch (type) {
    case 'dropdown': case 'radio': return optLabel(value)
    case 'multi_select': case 'checkbox': return Array.isArray(value) ? value.map(optLabel).join(', ') : String(value)
    case 'date_range': return `${value.start || ''} → ${value.end || ''}`
    case 'address': return ['line1', 'line2', 'city', 'state', 'postal_code', 'country'].map((k) => value[k]).filter(Boolean).join(', ')
    case 'file': case 'multi_file': return Array.isArray(value) ? value.map((f) => f.name).join(', ') : ''
    case 'payment': return value.status === 'PAID' ? `Paid ${formatMoney(value.amount, value.currency)}` : value.status || ''
    case 'signature': return 'Signed'
    case 'rich_text': return stripTags(value)
    case 'password': return '••••••'
    case 'rating': return `${value} ★`
    case 'currency': return formatMoney(value, field?.config?.currency || 'INR')
    default: return Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value)
  }
}

export const STATUS_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PUBLISHED: 'bg-emerald-100 text-emerald-800',
  ARCHIVED: 'bg-amber-100 text-amber-800',
  SUBMITTED: 'bg-emerald-100 text-emerald-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  ABANDONED: 'bg-rose-100 text-rose-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  CREATED: 'bg-slate-100 text-slate-700',
  FAILED: 'bg-rose-100 text-rose-800',
}
