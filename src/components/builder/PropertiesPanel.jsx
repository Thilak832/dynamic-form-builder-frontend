import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FIELD_TYPES } from '../../lib/fieldTypes'
import { DISPLAY_ONLY, FILE_TYPES } from '../../lib/logic'
import { builder } from '../../store/builderSlice'
import { Tabs } from '../ui'
import LogicEditor from './LogicEditor'

const TEXT_TYPES = ['text', 'textarea', 'password', 'city', 'rich_text', 'email', 'phone', 'postal_code']
const NUMBER_TYPES = ['number', 'currency']
const FILE_EXTS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.heic', '.doc', '.docx']

const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'option'

function Row({ label, children, hint }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

const num = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v))

/**
 * Option values follow their label until the form is published; after that they are
 * frozen so renaming a label doesn't orphan existing answers and logic conditions.
 */
function OptionsEditor({ options, onChange, locked }) {
  const list = options || []
  const update = (i, label) => onChange(list.map((o, j) => (j === i ? { label, value: locked ? o.value : slug(label) } : o)))
  const addOption = () => {
    const taken = new Set(list.map((o) => o.value))
    let n = list.length + 1
    while (taken.has(`option_${n}`)) n++
    onChange([...list, { label: `Option ${n}`, value: `option_${n}` }])
  }
  const move = (i, d) => {
    const next = [...list]
    const [o] = next.splice(i, 1)
    next.splice(i + d, 0, o)
    onChange(next)
  }
  return (
    <div className="space-y-2">
      {list.map((o, i) => (
        <div key={i} className="flex items-center gap-1">
          <input className="input" value={o.label} onChange={(e) => update(i, e.target.value)} aria-label={`Option ${i + 1}`} />
          <button type="button" className="btn-ghost btn-sm px-2" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
          <button type="button" className="btn-ghost btn-sm px-2" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
          <button type="button" className="btn-ghost btn-sm px-2 text-red-600" onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
        </div>
      ))}
      <button type="button" className="btn-secondary btn-sm w-full" onClick={addOption}>+ Add option</button>
      <p className="text-xs text-slate-500">Stored values: {list.map((o) => o.value).join(', ') || '-'}</p>
      {locked && <p className="text-xs text-slate-500">Values are fixed after publishing so existing responses stay consistent.</p>}
    </div>
  )
}

function DateBound({ label, value, onChange }) {
  const isToday = value === 'today'
  return (
    <Row label={label}>
      <div className="flex items-center gap-2">
        <input type="date" className="input" value={isToday ? '' : value || ''} disabled={isToday} onChange={(e) => onChange(e.target.value || undefined)} />
        <Check label="Today" checked={isToday} onChange={(c) => onChange(c ? 'today' : undefined)} />
      </div>
    </Row>
  )
}

function ValidationSection({ field, setConfig }) {
  const c = field.config || {}
  const v = c.validation || {}
  const setV = (patch) => setConfig({ validation: { ...v, ...patch } })
  const t = field.field_type

  return (
    <div className="space-y-4">
      {TEXT_TYPES.includes(t) && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Min length"><input type="number" min={0} className="input" value={v.min_length ?? ''} onChange={(e) => setV({ min_length: num(e.target.value) })} /></Row>
            <Row label="Max length"><input type="number" min={0} className="input" value={v.max_length ?? ''} onChange={(e) => setV({ max_length: num(e.target.value) })} /></Row>
          </div>
          {t !== 'rich_text' && (
            <>
              <Row label="Custom pattern (regex)" hint="The whole answer must match, e.g. [A-Z][0-9]{7} for passport numbers.">
                <input className="input font-mono" value={v.pattern ?? ''} onChange={(e) => setV({ pattern: e.target.value || undefined })} />
              </Row>
              {v.pattern && (
                <Row label="Error message"><input className="input" value={v.pattern_message ?? ''} onChange={(e) => setV({ pattern_message: e.target.value })} /></Row>
              )}
            </>
          )}
        </>
      )}
      {NUMBER_TYPES.includes(t) && (
        <div className="grid grid-cols-2 gap-2">
          <Row label="Minimum"><input type="number" className="input" value={v.min ?? ''} onChange={(e) => setV({ min: num(e.target.value) })} /></Row>
          <Row label="Maximum"><input type="number" className="input" value={v.max ?? ''} onChange={(e) => setV({ max: num(e.target.value) })} /></Row>
        </div>
      )}
      {t === 'currency' && (
        <Row label="Currency code"><input className="input uppercase" maxLength={3} value={c.currency || 'INR'} onChange={(e) => setConfig({ currency: e.target.value.toUpperCase() })} /></Row>
      )}
      {(t === 'date' || t === 'date_range') && (
        <>
          <DateBound label="Earliest date" value={v.min_date} onChange={(val) => setV({ min_date: val })} />
          <DateBound label="Latest date" value={v.max_date} onChange={(val) => setV({ max_date: val })} />
          {t === 'date_range' && (
            <Row label="Maximum length (days)"><input type="number" min={1} className="input" value={v.max_days ?? ''} onChange={(e) => setV({ max_days: num(e.target.value) })} /></Row>
          )}
        </>
      )}
      {(t === 'checkbox' || t === 'multi_select') && (
        <div className="grid grid-cols-2 gap-2">
          <Row label="Min selections"><input type="number" min={0} className="input" value={v.min_selections ?? ''} onChange={(e) => setV({ min_selections: num(e.target.value) })} /></Row>
          <Row label="Max selections"><input type="number" min={1} className="input" value={v.max_selections ?? ''} onChange={(e) => setV({ max_selections: num(e.target.value) })} /></Row>
        </div>
      )}
      {FILE_TYPES.has(t) && (
        <>
          <Row label="Allowed file types">
            <div className="grid grid-cols-3 gap-1">
              {FILE_EXTS.map((ext) => {
                const types = v.file_types || []
                return <Check key={ext} label={ext} checked={types.includes(ext)} onChange={(on) => setV({ file_types: on ? [...types, ext] : types.filter((x) => x !== ext) })} />
              })}
            </div>
          </Row>
          <Row label="Max size per file (MB)" hint="The server caps uploads at 5 MB per file and 50 MB per response.">
            <input type="number" min={1} max={5} className="input" value={v.max_size_mb ?? 5} onChange={(e) => setV({ max_size_mb: num(e.target.value) })} />
          </Row>
          {t === 'multi_file' && (
            <Row label="Max number of files"><input type="number" min={1} max={20} className="input" value={c.max_files ?? 5} onChange={(e) => setConfig({ max_files: num(e.target.value) })} /></Row>
          )}
        </>
      )}
      {t === 'rating' && (
        <Row label="Number of stars"><input type="number" min={3} max={10} className="input" value={c.max_rating ?? 5} onChange={(e) => setConfig({ max_rating: num(e.target.value) })} /></Row>
      )}
      {t === 'slider' && (
        <div className="grid grid-cols-3 gap-2">
          <Row label="Min"><input type="number" className="input" value={c.min ?? 0} onChange={(e) => setConfig({ min: num(e.target.value) })} /></Row>
          <Row label="Max"><input type="number" className="input" value={c.max ?? 100} onChange={(e) => setConfig({ max: num(e.target.value) })} /></Row>
          <Row label="Step"><input type="number" min={1} className="input" value={c.step ?? 1} onChange={(e) => setConfig({ step: num(e.target.value) })} /></Row>
        </div>
      )}
      {['toggle', 'address', 'country', 'state', 'time', 'url', 'social', 'signature', 'terms', 'radio', 'dropdown'].includes(t) && (
        <p className="text-sm text-slate-500">{FIELD_TYPES[t].label} answers are validated automatically{t === 'url' ? ' (http/https URL)' : t === 'social' ? ' (handle format)' : ''}. Use the Required switch to make it mandatory.</p>
      )}
    </div>
  )
}

function PaymentSection({ field, setConfig, allFields }) {
  const c = field.config || {}
  const numberFields = allFields.filter((f) => ['number', 'slider', 'currency'].includes(f.field_type))
  const choiceFields = allFields.filter((f) => ['dropdown', 'radio', 'checkbox', 'multi_select'].includes(f.field_type))
  const priced = c.option_prices || {}
  const setPrice = (fk, optionValue, price) => {
    const current = { ...(priced[fk] || {}) }
    if (price === '' || price === undefined) delete current[optionValue]
    else current[optionValue] = Number(price)
    const next = { ...priced, [fk]: current }
    if (!Object.keys(current).length) delete next[fk]
    setConfig({ option_prices: next })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Row label="Base amount"><input type="number" min={0} className="input" value={c.amount ?? 0} onChange={(e) => setConfig({ amount: num(e.target.value) ?? 0 })} /></Row>
        <Row label="Currency"><input className="input uppercase" maxLength={3} value={c.currency || 'INR'} onChange={(e) => setConfig({ currency: e.target.value.toUpperCase() })} /></Row>
      </div>
      <Row label="Description shown to the customer"><input className="input" value={c.description || ''} onChange={(e) => setConfig({ description: e.target.value })} /></Row>
      <Row label="Charge per unit of" hint="e.g. INR 2,000 per traveller">
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={c.per_unit_field || ''} onChange={(e) => setConfig({ per_unit_field: e.target.value || undefined })}>
            <option value="">No per-unit pricing</option>
            {numberFields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <input type="number" min={0} className="input" placeholder="Amount per unit" disabled={!c.per_unit_field} value={c.per_unit_amount ?? ''} onChange={(e) => setConfig({ per_unit_amount: num(e.target.value) })} />
        </div>
      </Row>
      {choiceFields.length > 0 && (
        <Row label="Add-on prices by selection">
          <div className="space-y-3">
            {choiceFields.map((f) => (
              <details key={f.key} className="rounded-lg border border-slate-200 p-2" open={!!priced[f.key]}>
                <summary className="cursor-pointer text-sm font-medium">{f.label}</summary>
                <div className="mt-2 space-y-1">
                  {(f.config?.options || []).map((o) => (
                    <div key={o.value} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate">{o.label}</span>
                      <input type="number" min={0} className="input w-28" placeholder="+0" value={priced[f.key]?.[o.value] ?? ''} onChange={(e) => setPrice(f.key, o.value, e.target.value)} />
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </Row>
      )}
      <Row label="Deposit percentage" hint="Charge only part of the total now (e.g. 20% advance). Leave empty for full payment.">
        <input type="number" min={1} max={99} className="input" value={c.deposit_percent ?? ''} onChange={(e) => setConfig({ deposit_percent: num(e.target.value) })} />
      </Row>
    </div>
  )
}

function PageSettings() {
  const dispatch = useDispatch()
  const { form, pageIndex } = useSelector((s) => s.builder)
  const page = form.pages[pageIndex]
  const set = (patch) => dispatch(builder.updatePage({ index: pageIndex, patch }))
  const earlierFields = form.pages.slice(0, pageIndex).flatMap((p) => p.fields)

  return (
    <div className="space-y-5 p-4">
      <h3 className="font-semibold">Page {pageIndex + 1} settings</h3>
      <Row label="Title"><input className="input" value={page.title} onChange={(e) => set({ title: e.target.value })} /></Row>
      <Row label="Description"><textarea rows={2} className="input" value={page.description || ''} onChange={(e) => set({ description: e.target.value })} /></Row>
      <Check label="Show progress bar" checked={page.show_progress_bar} onChange={(v) => set({ show_progress_bar: v })} />
      <Check label="All fields on this page are required" checked={page.required_all_fields} onChange={(v) => set({ required_all_fields: v })} />
      <div>
        <h4 className="mb-2 text-sm font-semibold">⚡ Page logic</h4>
        {pageIndex === 0
          ? <p className="text-sm text-slate-500">The first page is always shown. Add logic to later pages to skip them based on earlier answers.</p>
          : <LogicEditor rule={page.logic} onChange={(logic) => set({ logic })} sourceFields={earlierFields} subject="page" />}
      </div>
      <div className="flex gap-2 border-t border-slate-200 pt-4">
        <button className="btn-secondary btn-sm" disabled={pageIndex === 0} onClick={() => dispatch(builder.movePage({ from: pageIndex, to: pageIndex - 1 }))}>← Move left</button>
        <button className="btn-secondary btn-sm" disabled={pageIndex === form.pages.length - 1} onClick={() => dispatch(builder.movePage({ from: pageIndex, to: pageIndex + 1 }))}>Move right →</button>
        <button className="btn-ghost btn-sm ml-auto text-red-600" disabled={form.pages.length <= 1}
          onClick={() => { if (window.confirm(`Delete "${page.title}" and its ${page.fields.length} field(s)?`)) dispatch(builder.removePage(pageIndex)) }}>
          Delete page
        </button>
      </div>
    </div>
  )
}

export default function PropertiesPanel() {
  const dispatch = useDispatch()
  const { form, selectedKey } = useSelector((s) => s.builder)
  const [tab, setTab] = useState('general')

  const pageIdx = form.pages.findIndex((p) => p.fields.some((f) => f.key === selectedKey))
  if (pageIdx === -1) return <PageSettings />
  const field = form.pages[pageIdx].fields.find((f) => f.key === selectedKey)
  const def = FIELD_TYPES[field.field_type]
  const set = (patch) => dispatch(builder.updateField({ key: field.key, patch }))
  const setConfig = (patch) => dispatch(builder.updateFieldConfig({ key: field.key, patch }))
  const displayOnly = DISPLAY_ONLY.has(field.field_type)

  const allFields = form.pages.flatMap((p) => p.fields)
  const fieldsBefore = [...form.pages.slice(0, pageIdx).flatMap((p) => p.fields),
    ...form.pages[pageIdx].fields.slice(0, form.pages[pageIdx].fields.findIndex((f) => f.key === field.key))]

  const tabs = [
    { value: 'general', label: 'General' },
    ...(def.hasOptions ? [{ value: 'options', label: 'Options' }] : []),
    ...(field.field_type === 'payment' ? [{ value: 'payment', label: 'Pricing' }] : []),
    ...(!displayOnly && field.field_type !== 'payment' ? [{ value: 'validation', label: 'Validation' }] : []),
    { value: 'logic', label: field.config?.conditional_logic?.conditions?.length ? 'Logic ⚡' : 'Logic' },
  ]
  const activeTab = tabs.some((t) => t.value === tab) ? tab : 'general'

  return (
    <div>
      <div className="flex items-center gap-2 px-4 pt-4">
        <span className="flex h-7 w-8 items-center justify-center rounded bg-brand-100 text-xs font-semibold text-brand-700">{def.icon}</span>
        <h3 className="font-semibold">{def.label}</h3>
        <button className="btn-ghost btn-sm ml-auto" onClick={() => dispatch(builder.selectField(null))} aria-label="Close field settings">✕</button>
      </div>
      <div className="mt-3 px-2"><Tabs tabs={tabs} value={activeTab} onChange={setTab} /></div>
      <div className="space-y-4 p-4">
        {activeTab === 'general' && (
          <>
            <Row label={displayOnly ? 'Text' : 'Label'}>
              {field.field_type === 'paragraph'
                ? <textarea rows={4} className="input" value={field.label} onChange={(e) => set({ label: e.target.value })} />
                : <input className="input" value={field.label} onChange={(e) => set({ label: e.target.value })} />}
            </Row>
            {!displayOnly && (
              <>
                {!['toggle', 'rating', 'slider', 'radio', 'checkbox', 'multi_select', 'file', 'multi_file', 'signature', 'payment', 'terms', 'address', 'date_range'].includes(field.field_type) && (
                  <Row label="Placeholder"><input className="input" value={field.placeholder || ''} onChange={(e) => set({ placeholder: e.target.value })} /></Row>
                )}
                <Row label="Help text"><input className="input" value={field.help_text || ''} onChange={(e) => set({ help_text: e.target.value })} /></Row>
                <Check label="Required" checked={field.required} onChange={(v) => set({ required: v })} />
                {field.field_type === 'terms' && (
                  <Row label="Terms text"><textarea rows={4} className="input" value={field.config?.terms_text || ''} onChange={(e) => setConfig({ terms_text: e.target.value })} /></Row>
                )}
                {field.field_type === 'state' && (
                  <Row label="Country comes from" hint="Shows a state list for India and the US; otherwise a text box.">
                    <select className="input" value={field.config?.country_field || ''} onChange={(e) => setConfig({ country_field: e.target.value || undefined })}>
                      <option value="">Fixed: India</option>
                      {allFields.filter((f) => f.field_type === 'country').map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                  </Row>
                )}
                {['text', 'email', 'phone', 'number', 'dropdown', 'radio', 'country', 'city', 'slider'].includes(field.field_type) && (
                  <Row label="Default value">
                    <input className="input" value={field.config?.default_value ?? ''}
                      onChange={(e) => setConfig({ default_value: e.target.value === '' ? undefined : ['number', 'slider'].includes(field.field_type) ? Number(e.target.value) : e.target.value })} />
                  </Row>
                )}
                <Row label="Field key" hint={`Prefill via URL: ?${field.key}=value`}>
                  <input className="input font-mono text-xs" value={field.key} readOnly onFocus={(e) => e.target.select()} />
                </Row>
              </>
            )}
            {form.pages.length > 1 && (
              <Row label="Page">
                <select className="input" value={pageIdx} onChange={(e) => dispatch(builder.moveFieldToPage({ key: field.key, pageIndex: Number(e.target.value) }))}>
                  {form.pages.map((p, i) => <option key={p.key} value={i}>{i + 1}. {p.title}</option>)}
                </select>
              </Row>
            )}
            <div className="flex gap-2 border-t border-slate-200 pt-4">
              <button className="btn-secondary btn-sm" onClick={() => dispatch(builder.duplicateField(field.key))}>Duplicate</button>
              <button className="btn-ghost btn-sm ml-auto text-red-600" onClick={() => dispatch(builder.removeField(field.key))}>Delete field</button>
            </div>
          </>
        )}
        {activeTab === 'options' && <OptionsEditor options={field.config?.options} locked={form.version > 0} onChange={(options) => setConfig({ options })} />}
        {activeTab === 'validation' && <ValidationSection field={field} setConfig={setConfig} />}
        {activeTab === 'payment' && <PaymentSection field={field} setConfig={setConfig} allFields={allFields.filter((f) => f.key !== field.key)} />}
        {activeTab === 'logic' && (
          <LogicEditor rule={field.config?.conditional_logic} onChange={(rule) => setConfig({ conditional_logic: rule })} sourceFields={fieldsBefore} />
        )}
      </div>
    </div>
  )
}
