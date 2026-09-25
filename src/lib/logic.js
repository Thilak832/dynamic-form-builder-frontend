// Mirror of backend/app/logic.py - keep the two in sync.
// Conditional visibility, answer validation and payment amounts.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const POSTAL_RE = /^[A-Za-z0-9\- ]{3,10}$/
const SOCIAL_RE = /^@?[A-Za-z0-9_.]{1,50}$/
const TAG_RE = /<[^>]*>/g

export const DISPLAY_ONLY = new Set(['heading', 'paragraph'])
export const FILE_TYPES = new Set(['file', 'multi_file'])

export const OPERATORS = [
  { value: 'equals', label: 'equals', needsValue: true },
  { value: 'not_equals', label: 'does not equal', needsValue: true },
  { value: 'contains', label: 'contains', needsValue: true },
  { value: 'not_contains', label: 'does not contain', needsValue: true },
  { value: 'gt', label: 'is greater than', needsValue: true },
  { value: 'gte', label: 'is at least', needsValue: true },
  { value: 'lt', label: 'is less than', needsValue: true },
  { value: 'lte', label: 'is at most', needsValue: true },
  { value: 'is_empty', label: 'is empty', needsValue: false },
  { value: 'is_not_empty', label: 'is filled', needsValue: false },
]

export function isEmpty(value) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.values(value).every(isEmpty)
  return false
}

function toNumber(value) {
  if (typeof value === 'boolean' || value === null || value === undefined || value === '') return null
  const n = Number(String(value).trim())
  return Number.isFinite(n) ? n : null
}

function toStr(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value === null || value === undefined) return ''
  return String(value)
}

function parseDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(String(value))) return null
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function resolveDate(spec) {
  if (!spec) return null
  return parseDate(spec === 'today' ? todayISO() : spec)
}

export function resolveDateSpec(spec) {
  if (!spec) return undefined
  return spec === 'today' ? todayISO() : spec
}

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ------------------------------------------------------------------ conditional logic

export function evaluateCondition(cond, answers) {
  const op = cond.operator || 'equals'
  const actual = answers[cond.field]
  const expected = cond.value

  if (op === 'is_empty') return isEmpty(actual)
  if (op === 'is_not_empty') return !isEmpty(actual)

  if (['gt', 'gte', 'lt', 'lte'].includes(op)) {
    const a = toNumber(actual)
    const b = toNumber(expected)
    if (a === null || b === null) return false
    return { gt: a > b, gte: a >= b, lt: a < b, lte: a <= b }[op]
  }

  if (Array.isArray(actual)) {
    const values = actual.map((v) => toStr(v).toLowerCase())
    const exp = toStr(expected).toLowerCase()
    if (op === 'equals' || op === 'contains') return values.includes(exp)
    if (op === 'not_equals' || op === 'not_contains') return !values.includes(exp)
    return false
  }

  const a = toStr(actual).toLowerCase()
  const e = toStr(expected).toLowerCase()
  if (op === 'equals') return a === e
  if (op === 'not_equals') return a !== e
  if (op === 'contains') return a.includes(e)
  if (op === 'not_contains') return !a.includes(e)
  return false
}

export function evaluateRule(rule, answers) {
  if (!rule || !rule.conditions?.length) return true
  const results = rule.conditions.filter((c) => c.field).map((c) => evaluateCondition(c, answers))
  if (!results.length) return true
  const matched = (rule.match || 'all') === 'all' ? results.every(Boolean) : results.some(Boolean)
  return (rule.action || 'show') === 'show' ? matched : !matched
}

function shallowEqual(a, b) {
  const ka = Object.keys(a)
  if (ka.length !== Object.keys(b).length) return false
  return ka.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]))
}

/** Returns { pages: Set<pageKey>, fields: Set<fieldKey> } of visible elements. */
export function computeVisibility(schema, answers) {
  let effective = { ...answers }
  let pages = new Set()
  let fields = new Set()
  for (let i = 0; i < 10; i++) {
    pages = new Set()
    fields = new Set()
    for (const page of schema.pages || []) {
      if (!evaluateRule(page.logic, effective)) continue
      pages.add(page.key)
      for (const field of page.fields || []) {
        if (evaluateRule(field.config?.conditional_logic, effective)) fields.add(field.key)
      }
    }
    const next = Object.fromEntries(Object.entries(answers).filter(([k]) => fields.has(k)))
    if (shallowEqual(next, effective)) break
    effective = next
  }
  return { pages, fields }
}

// ------------------------------------------------------------------ validation

function optionValues(field) {
  return new Set((field.config?.options || []).map((o) => toStr(o.value)))
}

function checkLength(text, v, label) {
  if (v.min_length && text.length < Number(v.min_length)) return `${label} must be at least ${v.min_length} characters`
  if (v.max_length && text.length > Number(v.max_length)) return `${label} must be at most ${v.max_length} characters`
  return null
}

function checkPattern(text, v) {
  if (!v.pattern) return null
  try {
    if (!new RegExp(`^(?:${v.pattern})$`).test(text)) return v.pattern_message || 'Invalid format'
  } catch {
    return null
  }
  return null
}

function checkRange(num, v, label) {
  if (v.min !== undefined && v.min !== null && v.min !== '' && num < Number(v.min)) return `${label} must be at least ${v.min}`
  if (v.max !== undefined && v.max !== null && v.max !== '' && num > Number(v.max)) return `${label} must be at most ${v.max}`
  return null
}

function checkDate(d, v, label) {
  const lo = resolveDate(v.min_date)
  const hi = resolveDate(v.max_date)
  if (lo && d < lo) return `${label} must be on or after ${iso(lo)}`
  if (hi && d > hi) return `${label} must be on or before ${iso(hi)}`
  return null
}

export function validateField(field, value, requiredOverride = false) {
  const type = field.field_type
  if (DISPLAY_ONLY.has(type)) return null
  const config = field.config || {}
  const v = config.validation || {}
  const label = field.label || 'This field'
  const required = field.required || requiredOverride

  if (type === 'terms') return required && value !== true ? 'You must accept the terms to continue' : null
  if (type === 'payment') return required && value?.status !== 'PAID' ? 'Payment is required to continue' : null

  if (type === 'address') {
    const a = value && typeof value === 'object' ? value : {}
    if (required) {
      for (const part of ['line1', 'city', 'country']) {
        if (isEmpty(a[part])) return `${label}: ${part === 'line1' ? 'street address' : part} is required`
      }
    }
    if (!isEmpty(a.postal_code) && !POSTAL_RE.test(String(a.postal_code))) return `${label}: invalid postal code`
    return null
  }

  if (isEmpty(value)) return required ? `${label} is required` : null

  switch (type) {
    case 'text': case 'textarea': case 'password': case 'city':
      if (typeof value !== 'string') return `${label} must be text`
      return checkLength(value, v, label) || checkPattern(value, v)
    case 'rich_text':
      return checkLength(String(value).replace(TAG_RE, ''), v, label)
    case 'email':
      if (!EMAIL_RE.test(String(value).trim())) return 'Enter a valid email address'
      return checkPattern(String(value), v)
    case 'phone': {
      const digits = String(value).replace(/\D/g, '')
      if (!PHONE_RE.test(String(value)) || digits.length < 7 || digits.length > 15) return 'Enter a valid phone number'
      return checkPattern(String(value), v)
    }
    case 'url':
      return URL_RE.test(String(value)) ? null : 'Enter a valid URL starting with http:// or https://'
    case 'social':
      return SOCIAL_RE.test(String(value)) ? null : 'Enter a valid handle, e.g. @traveller'
    case 'postal_code':
      return POSTAL_RE.test(String(value)) ? checkPattern(String(value), v) : 'Enter a valid postal code'
    case 'number': case 'currency': case 'slider': case 'rating': {
      const num = toNumber(value)
      if (num === null) return `${label} must be a number`
      if (type === 'rating') {
        const max = Number(config.max_rating || 5)
        return num >= 1 && num <= max ? null : `${label} must be between 1 and ${max}`
      }
      if (type === 'slider') {
        const lo = Number(config.min ?? 0)
        const hi = Number(config.max ?? 100)
        if (num < lo || num > hi) return `${label} must be between ${lo} and ${hi}`
      }
      if (type === 'currency' && num < 0) return `${label} cannot be negative`
      return checkRange(num, v, label)
    }
    case 'date': {
      const d = parseDate(value)
      return d ? checkDate(d, v, label) : 'Enter a valid date'
    }
    case 'date_range': {
      const start = parseDate(value?.start)
      const end = parseDate(value?.end)
      if (!start || !end) return 'Select both a start and an end date'
      if (end < start) return 'End date must be after start date'
      if (v.max_days && (end - start) / 86400000 > Number(v.max_days)) return `Range cannot exceed ${v.max_days} days`
      return checkDate(start, v, label) || checkDate(end, v, label)
    }
    case 'time':
      return TIME_RE.test(String(value)) ? null : 'Enter a valid time (HH:MM)'
    case 'dropdown': case 'radio':
      return optionValues(field).has(toStr(value)) ? null : 'Select a valid option'
    case 'multi_select': case 'checkbox': {
      if (!Array.isArray(value)) return 'Select one or more options'
      const allowed = optionValues(field)
      if (value.some((x) => !allowed.has(toStr(x)))) return 'Select valid options'
      if (v.min_selections && value.length < Number(v.min_selections)) return `Select at least ${v.min_selections}`
      if (v.max_selections && value.length > Number(v.max_selections)) return `Select at most ${v.max_selections}`
      return null
    }
    case 'toggle':
      return typeof value === 'boolean' ? null : `${label} must be on or off`
    case 'file': case 'multi_file': {
      const max = Number(config.max_files || (type === 'file' ? 1 : 5))
      return value.length > max ? `Upload at most ${max} file(s)` : null
    }
    case 'signature':
      return String(value).startsWith('data:image/png;base64,') ? null : 'Please sign in the box'
    default:
      return null
  }
}

/** Validates visible fields (optionally only one page). Returns {fieldKey: message}. */
export function validateAnswers(schema, answers, pageKey = null) {
  const { fields: visible } = computeVisibility(schema, answers)
  const errors = {}
  for (const page of schema.pages || []) {
    if (pageKey && page.key !== pageKey) continue
    for (const field of page.fields || []) {
      if (!visible.has(field.key)) continue
      const err = validateField(field, answers[field.key], page.required_all_fields)
      if (err) errors[field.key] = err
    }
  }
  return errors
}

// ------------------------------------------------------------------ payments

export function computePaymentAmount(field, answers) {
  const c = field.config || {}
  let total = toNumber(c.amount) || 0
  if (c.per_unit_field) total += (toNumber(answers[c.per_unit_field]) || 0) * (toNumber(c.per_unit_amount) || 0)
  for (const [key, prices] of Object.entries(c.option_prices || {})) {
    const selected = Array.isArray(answers[key]) ? answers[key] : [answers[key]]
    for (const s of selected) total += toNumber((prices || {})[toStr(s)]) || 0
  }
  const pct = toNumber(c.deposit_percent)
  if (pct && pct > 0 && pct < 100) total = (total * pct) / 100
  return Math.max(0, Math.round(total * 100) / 100)
}

export function allFields(schema) {
  return (schema.pages || []).flatMap((p) => p.fields || [])
}
