import { COUNTRIES, STATES } from '../../lib/geo'
import { resolveDateSpec } from '../../lib/logic'
import FileInput from './FileInput'
import PaymentInput from './PaymentInput'
import RichTextInput from './RichTextInput'
import SignaturePad from './SignaturePad'

const inputCls = (error) => `input ${error ? 'input-error' : ''}`

function Choice({ type, name, checked, onChange, label }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${checked ? 'border-[var(--brand)] bg-slate-50' : 'border-slate-200 hover:bg-slate-50'}`}>
      <input type={type} name={name} checked={checked} onChange={onChange} className="accent-theme h-4 w-4" />
      <span>{label}</span>
    </label>
  )
}

/** Renders the input for one field. `ctx` carries answers, schema and live-mode adapters. */
export default function FieldInput({ field, value, onChange, error, ctx }) {
  const c = field.config || {}
  const v = c.validation || {}
  const id = `f_${field.key}`
  const common = { id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}_err` : undefined }
  const options = c.options || []

  switch (field.field_type) {
    case 'heading':
      return <h3 className="border-b border-slate-200 pb-1 text-lg font-semibold">{field.label}</h3>
    case 'paragraph':
      return <p className="whitespace-pre-line text-sm text-slate-600">{field.label}</p>

    case 'text': case 'email': case 'phone': case 'url': case 'password': case 'social': case 'city': case 'postal_code': {
      const typeMap = { email: 'email', phone: 'tel', url: 'url', password: 'password' }
      const autoMap = { email: 'email', phone: 'tel', city: 'address-level2', postal_code: 'postal-code' }
      return (
        <input {...common} type={typeMap[field.field_type] || 'text'} className={inputCls(error)} value={value ?? ''}
          placeholder={field.placeholder || ''} autoComplete={autoMap[field.field_type] || (field.label?.toLowerCase().includes('name') ? 'name' : 'off')}
          maxLength={v.max_length || undefined} onChange={(e) => onChange(e.target.value)} />
      )
    }
    case 'textarea':
      return <textarea {...common} rows={4} className={inputCls(error)} value={value ?? ''} placeholder={field.placeholder || ''}
        maxLength={v.max_length || undefined} onChange={(e) => onChange(e.target.value)} />
    case 'rich_text':
      return <RichTextInput value={value} onChange={onChange} placeholder={field.placeholder} invalid={!!error} />

    case 'number':
      return <input {...common} type="number" inputMode="numeric" className={inputCls(error)} value={value ?? ''} min={v.min} max={v.max}
        placeholder={field.placeholder || ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
    case 'currency':
      return (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">{c.currency || 'INR'}</span>
          <input {...common} type="number" inputMode="decimal" min={0} step="0.01" className={`${inputCls(error)} pl-12`} value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
        </div>
      )

    case 'date':
      return <input {...common} type="date" className={inputCls(error)} value={value ?? ''} min={resolveDateSpec(v.min_date)} max={resolveDateSpec(v.max_date)}
        onChange={(e) => onChange(e.target.value)} />
    case 'date_range': {
      const range = value || {}
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-xs text-slate-500">From</span>
            <input {...common} type="date" className={inputCls(error)} value={range.start ?? ''} min={resolveDateSpec(v.min_date)} max={resolveDateSpec(v.max_date)}
              onChange={(e) => onChange({ ...range, start: e.target.value })} />
          </div>
          <div>
            <span className="text-xs text-slate-500">To</span>
            <input type="date" className={inputCls(error)} value={range.end ?? ''} min={range.start || resolveDateSpec(v.min_date)} max={resolveDateSpec(v.max_date)}
              onChange={(e) => onChange({ ...range, end: e.target.value })} aria-label={`${field.label} end`} />
          </div>
        </div>
      )
    }
    case 'time':
      return <input {...common} type="time" className={inputCls(error)} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />

    case 'dropdown':
      return (
        <select {...common} className={inputCls(error)} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">{field.placeholder || 'Select...'}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )
    case 'radio':
      return (
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" id={id}>
          {options.map((o) => <Choice key={o.value} type="radio" name={id} label={o.label} checked={value === o.value} onChange={() => onChange(o.value)} />)}
        </div>
      )
    case 'checkbox': {
      const selected = Array.isArray(value) ? value : []
      const toggle = (val) => onChange(selected.includes(val) ? selected.filter((x) => x !== val) : [...selected, val])
      return (
        <div className="grid gap-2 sm:grid-cols-2" id={id}>
          {options.map((o) => <Choice key={o.value} type="checkbox" label={o.label} checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />)}
        </div>
      )
    }
    case 'multi_select': {
      const selected = Array.isArray(value) ? value : []
      const toggle = (val) => onChange(selected.includes(val) ? selected.filter((x) => x !== val) : [...selected, val])
      return (
        <div className="flex flex-wrap gap-2" id={id} role="group">
          {options.map((o) => {
            const on = selected.includes(o.value)
            return (
              <button type="button" key={o.value} onClick={() => toggle(o.value)} aria-pressed={on}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? 'bg-theme border-transparent text-white' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
                {on ? '✓ ' : ''}{o.label}
              </button>
            )
          })}
        </div>
      )
    }
    case 'toggle':
      return (
        <button type="button" role="switch" aria-checked={!!value} id={id} onClick={() => onChange(!value)}
          className={`relative h-7 w-12 rounded-full transition ${value ? 'bg-theme' : 'bg-slate-300'}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? 'left-6' : 'left-1'}`} />
          <span className="sr-only">{value ? 'Yes' : 'No'}</span>
        </button>
      )
    case 'rating': {
      const max = Number(c.max_rating || 5)
      return (
        <div className="flex gap-1" id={id} role="radiogroup">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button type="button" key={n} onClick={() => onChange(n)} aria-label={`${n} of ${max}`} aria-checked={value === n} role="radio"
              className={`text-3xl leading-none transition ${n <= (value || 0) ? 'text-amber-400' : 'text-slate-300 hover:text-amber-200'}`}>★</button>
          ))}
        </div>
      )
    }
    case 'slider': {
      const min = Number(c.min ?? 0)
      const max = Number(c.max ?? 100)
      const current = value ?? c.default_value ?? min
      return (
        <div>
          <input {...common} type="range" className="accent-theme w-full" min={min} max={max} step={c.step || 1} value={current}
            onChange={(e) => onChange(Number(e.target.value))} />
          <div className="flex justify-between text-xs text-slate-500"><span>{min}</span><span className="font-semibold text-slate-800">{value ?? '-'}</span><span>{max}</span></div>
        </div>
      )
    }

    case 'country':
      return (
        <select {...common} className={inputCls(error)} value={value ?? ''} onChange={(e) => onChange(e.target.value)} autoComplete="country-name">
          <option value="">Select country...</option>
          {COUNTRIES.map((n) => <option key={n}>{n}</option>)}
        </select>
      )
    case 'state': {
      const linkedCountry = c.country_field ? ctx.answers[c.country_field] : c.country || 'India'
      const states = STATES[linkedCountry]
      return states ? (
        <select {...common} className={inputCls(error)} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select state...</option>
          {states.map((n) => <option key={n}>{n}</option>)}
        </select>
      ) : <input {...common} className={inputCls(error)} value={value ?? ''} placeholder="State / Province" onChange={(e) => onChange(e.target.value)} />
    }
    case 'address': {
      const a = value || {}
      const set = (k) => (e) => onChange({ ...a, [k]: e.target.value })
      return (
        <div className="grid gap-2 sm:grid-cols-2" id={id}>
          <input className={`${inputCls(error)} sm:col-span-2`} placeholder="Street address" value={a.line1 ?? ''} onChange={set('line1')} autoComplete="address-line1" />
          <input className={`${inputCls()} sm:col-span-2`} placeholder="Apartment, suite (optional)" value={a.line2 ?? ''} onChange={set('line2')} autoComplete="address-line2" />
          <input className={inputCls(error)} placeholder="City" value={a.city ?? ''} onChange={set('city')} autoComplete="address-level2" />
          {STATES[a.country]
            ? <select className={inputCls()} value={a.state ?? ''} onChange={set('state')}><option value="">State...</option>{STATES[a.country].map((n) => <option key={n}>{n}</option>)}</select>
            : <input className={inputCls()} placeholder="State / Province" value={a.state ?? ''} onChange={set('state')} autoComplete="address-level1" />}
          <input className={inputCls()} placeholder="Postal code" value={a.postal_code ?? ''} onChange={set('postal_code')} autoComplete="postal-code" />
          <select className={inputCls(error)} value={a.country ?? ''} onChange={set('country')} autoComplete="country-name">
            <option value="">Country...</option>
            {COUNTRIES.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
      )
    }

    case 'file': case 'multi_file':
      return <FileInput field={field} value={value} onChange={onChange} uploader={ctx.uploader?.(field.key)} />
    case 'signature':
      return <SignaturePad value={value} onChange={onChange} />
    case 'payment':
      return <PaymentInput field={field} value={value} onChange={onChange} visibleAnswers={ctx.visibleAnswers}
        payments={ctx.payments?.(field.key)} prefill={ctx.prefill} />
    case 'terms':
      return (
        <div className="space-y-2">
          {c.terms_text && <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 whitespace-pre-line">{c.terms_text}</div>}
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input {...common} type="checkbox" className="accent-theme mt-0.5 h-4 w-4" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
            <span>{field.label}{field.required && <span className="text-red-500"> *</span>}</span>
          </label>
        </div>
      )
    default:
      return <p className="text-sm text-red-600">Unsupported field type: {field.field_type}</p>
  }
}
