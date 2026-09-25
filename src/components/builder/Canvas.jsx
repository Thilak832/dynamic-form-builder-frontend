import { Draggable, Droppable } from '@hello-pangea/dnd'
import { useDispatch, useSelector } from 'react-redux'
import { FIELD_TYPES } from '../../lib/fieldTypes'
import { DISPLAY_ONLY } from '../../lib/logic'
import { builder } from '../../store/builderSlice'
import FieldInput from '../renderer/FieldInput'

const PREVIEW_CTX = { answers: {}, visibleAnswers: {}, uploader: null, payments: null, prefill: {} }

function FieldCard({ field, selected, dragHandleProps, onSelect, onDuplicate, onRemove, dragging }) {
  const def = FIELD_TYPES[field.field_type] || {}
  const hasLogic = !!field.config?.conditional_logic?.conditions?.length
  const v = field.config?.validation || {}
  const hasValidation = Object.values(v).some((x) => x !== '' && x !== null && x !== undefined && !(Array.isArray(x) && !x.length))

  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-xl border bg-white p-4 transition ${selected ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200 hover:border-slate-300'} ${dragging ? 'shadow-xl' : ''}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span {...dragHandleProps} className="cursor-grab px-1 text-slate-400 hover:text-slate-600" aria-label="Drag to reorder" title="Drag to reorder">⋮⋮</span>
        <span className="chip bg-slate-100 text-slate-600">{def.icon} {def.label}</span>
        {field.required && <span className="chip bg-red-50 text-red-600">Required</span>}
        {hasLogic && <span className="chip bg-violet-100 text-violet-700" title="Has conditional logic">⚡ Logic</span>}
        {hasValidation && <span className="chip bg-amber-50 text-amber-700">Validation</span>}
        <div className="ml-auto flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          <button type="button" className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onDuplicate() }} title="Duplicate">⧉</button>
          <button type="button" className="btn-ghost btn-sm text-red-600" onClick={(e) => { e.stopPropagation(); onRemove() }} title="Delete">🗑</button>
        </div>
      </div>
      {!DISPLAY_ONLY.has(field.field_type) && field.field_type !== 'terms' && (
        <p className="label">{field.label || <em className="text-slate-400">Untitled</em>}{field.required && <span className="text-red-500"> *</span>}</p>
      )}
      <div className="pointer-events-none select-none" aria-hidden="true" inert="">
        <FieldInput field={field} value={field.config?.default_value} onChange={() => {}} ctx={PREVIEW_CTX} />
      </div>
      {field.help_text && <p className="mt-1 text-xs text-slate-500">{field.help_text}</p>}
    </div>
  )
}

export default function Canvas() {
  const dispatch = useDispatch()
  const { form, pageIndex, selectedKey } = useSelector((s) => s.builder)
  const page = form.pages[pageIndex]

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4" onClick={() => dispatch(builder.selectField(null))}>
        <input
          className="w-full border-0 bg-transparent p-0 text-xl font-semibold focus:outline-none focus:ring-0"
          value={page.title}
          placeholder="Page title"
          onChange={(e) => dispatch(builder.updatePage({ index: pageIndex, patch: { title: e.target.value } }))}
          aria-label="Page title"
        />
        <input
          className="mt-1 w-full border-0 bg-transparent p-0 text-sm text-slate-500 focus:outline-none focus:ring-0"
          value={page.description || ''}
          placeholder="Add a description (optional)"
          onChange={(e) => dispatch(builder.updatePage({ index: pageIndex, patch: { description: e.target.value } }))}
          aria-label="Page description"
        />
        {page.logic?.conditions?.length ? <p className="mt-2 text-xs text-violet-700">⚡ This page has conditional logic</p> : null}
      </div>

      <Droppable droppableId="canvas" type="FIELD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[240px] space-y-3 rounded-xl p-1 transition ${snapshot.isDraggingOver ? 'bg-brand-50 outline-dashed outline-2 outline-brand-200' : ''}`}
          >
            {page.fields.map((field, i) => (
              <Draggable key={field.key} draggableId={field.key} index={i}>
                {(p, s) => (
                  <div ref={p.innerRef} {...p.draggableProps}>
                    <FieldCard
                      field={field}
                      selected={selectedKey === field.key}
                      dragHandleProps={p.dragHandleProps}
                      dragging={s.isDragging}
                      onSelect={() => dispatch(builder.selectField(field.key))}
                      onDuplicate={() => dispatch(builder.duplicateField(field.key))}
                      onRemove={() => dispatch(builder.removeField(field.key))}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {!page.fields.length && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-16 text-center text-slate-500">
                <span className="text-3xl">⬅</span>
                <p className="font-medium">Drag fields here</p>
                <p className="text-sm">or click a field type in the palette</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}
