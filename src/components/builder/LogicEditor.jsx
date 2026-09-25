import { FIELD_TYPES } from '../../lib/fieldTypes'
import { DISPLAY_ONLY, OPERATORS } from '../../lib/logic'

/**
 * Edits a visibility rule: {action, match, conditions: [{field, operator, value}]}.
 * `sourceFields` are the fields a condition may reference.
 */
export default function LogicEditor({ rule, onChange, sourceFields, subject = 'field' }) {
  const candidates = sourceFields.filter((f) => !DISPLAY_ONLY.has(f.field_type) && !['file', 'multi_file', 'signature', 'payment'].includes(f.field_type))
  const r = rule || { action: 'show', match: 'all', conditions: [] }
  const set = (patch) => {
    const next = { ...r, ...patch }
    onChange(next.conditions.length ? next : null)
  }
  const setCond = (i, patch) => set({ conditions: r.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) })
  const addCond = () => set({ conditions: [...r.conditions, { field: candidates[0]?.key || '', operator: 'equals', value: '' }] })

  if (!candidates.length) {
    return <p className="text-sm text-slate-500">Add input fields before this {subject} to create conditions.</p>
  }

  return (
    <div className="space-y-3">
      {r.conditions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select className="input w-auto" value={r.action} onChange={(e) => set({ action: e.target.value })}>
            <option value="show">Show</option>
            <option value="hide">Hide</option>
          </select>
          <span>this {subject} when</span>
          <select className="input w-auto" value={r.match} onChange={(e) => set({ match: e.target.value })}>
            <option value="all">all</option>
            <option value="any">any</option>
          </select>
          <span>conditions match:</span>
        </div>
      )}

      {r.conditions.map((c, i) => {
        const src = candidates.find((f) => f.key === c.field)
        const op = OPERATORS.find((o) => o.value === c.operator)
        const options = src?.config?.options
        return (
          <div key={i} className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-violet-700">{i === 0 ? 'If' : r.match === 'all' ? 'And' : 'Or'}</span>
              <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => set({ conditions: r.conditions.filter((_, j) => j !== i) })}>Remove</button>
            </div>
            <select className="input" value={c.field} onChange={(e) => setCond(i, { field: e.target.value, value: '' })}>
              {!src && <option value="">Select a field...</option>}
              {candidates.map((f) => <option key={f.key} value={f.key}>{f.label || f.key} ({FIELD_TYPES[f.field_type]?.label})</option>)}
            </select>
            <select className="input" value={c.operator} onChange={(e) => setCond(i, { operator: e.target.value })}>
              {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {op?.needsValue && (
              options?.length ? (
                <select className="input" value={c.value ?? ''} onChange={(e) => setCond(i, { value: e.target.value })}>
                  <option value="">Select value...</option>
                  {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : ['toggle', 'terms'].includes(src?.field_type) ? (
                <select className="input" value={c.value ?? ''} onChange={(e) => setCond(i, { value: e.target.value })}>
                  <option value="true">On / Yes</option>
                  <option value="false">Off / No</option>
                </select>
              ) : (
                <input className="input" placeholder="Value" value={c.value ?? ''}
                  type={['number', 'currency', 'slider', 'rating'].includes(src?.field_type) ? 'number' : src?.field_type === 'date' ? 'date' : 'text'}
                  onChange={(e) => setCond(i, { value: e.target.value })} />
              )
            )}
          </div>
        )
      })}

      <button type="button" className="btn-secondary btn-sm w-full" onClick={addCond}>+ Add condition</button>
      {!r.conditions.length && <p className="text-xs text-slate-500">Without conditions this {subject} is always shown.</p>}
    </div>
  )
}
