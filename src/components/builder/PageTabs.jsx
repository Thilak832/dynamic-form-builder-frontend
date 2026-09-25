import { Droppable } from '@hello-pangea/dnd'
import { useDispatch, useSelector } from 'react-redux'
import { builder } from '../../store/builderSlice'

/** Page switcher. Each tab is also a drop target: drop a field on a tab to move it to that page. */
export default function PageTabs() {
  const dispatch = useDispatch()
  const { form, pageIndex } = useSelector((s) => s.builder)

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2">
      {form.pages.map((p, i) => (
        <Droppable key={p.key} droppableId={`page:${i}`} type="FIELD" isDropDisabled={i === pageIndex}>
          {(provided, snapshot) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="shrink-0">
              <button
                onClick={() => dispatch(builder.selectPage(i))}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  snapshot.isDraggingOver ? 'bg-brand-100 ring-2 ring-brand-500' : i === pageIndex ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${i === pageIndex ? 'bg-white/20' : 'bg-white'}`}>{i + 1}</span>
                <span className="max-w-[140px] truncate">{p.title || `Page ${i + 1}`}</span>
                <span className="text-xs opacity-60">{p.fields.length}</span>
                {p.logic?.conditions?.length ? <span title="Conditional page">⚡</span> : null}
              </button>
              <div className="hidden">{provided.placeholder}</div>
            </div>
          )}
        </Droppable>
      ))}
      <button className="btn-ghost btn-sm shrink-0" onClick={() => dispatch(builder.addPage())}>+ Add page</button>
    </div>
  )
}
