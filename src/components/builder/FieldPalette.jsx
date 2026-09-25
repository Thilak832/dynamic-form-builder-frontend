import { Draggable, Droppable } from '@hello-pangea/dnd'
import { useState } from 'react'
import { CATEGORIES, FIELD_TYPES } from '../../lib/fieldTypes'

function PaletteItem({ type, def, onAdd, dragging }) {
  return (
    <div
      className={`flex cursor-grab items-center gap-2 rounded-lg border bg-white px-2.5 py-2 text-sm select-none ${dragging ? 'border-brand-500 shadow-lg' : 'border-slate-200 hover:border-brand-500 hover:bg-brand-50'}`}
      onClick={() => onAdd(type)}
      title="Drag onto the canvas or click to add"
    >
      <span className="flex h-6 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-semibold text-slate-600">{def.icon}</span>
      <span className="truncate">{def.label}</span>
    </div>
  )
}

export default function FieldPalette({ onAdd, disabled }) {
  const [q, setQ] = useState('')
  const entries = Object.entries(FIELD_TYPES).filter(([, d]) => d.label.toLowerCase().includes(q.toLowerCase()))
  let index = 0

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-3">
        <input className="input" placeholder="Search fields..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search field types" />
      </div>
      <Droppable droppableId="palette" type="FIELD" isDropDisabled>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 space-y-4 overflow-y-auto p-3">
            {CATEGORIES.map((cat) => {
              const items = entries.filter(([, d]) => d.category === cat.id)
              if (!items.length) return null
              return (
                <div key={cat.id}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{cat.label}</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {items.map(([type, def]) => (
                      <Draggable key={type} draggableId={`palette:${type}`} index={index++} isDragDisabled={disabled}>
                        {(p, snapshot) => (
                          <>
                            <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}>
                              <PaletteItem type={type} def={def} onAdd={onAdd} dragging={snapshot.isDragging} />
                            </div>
                            {/* keep a copy in the palette while the item is being dragged */}
                            {snapshot.isDragging && <PaletteItem type={type} def={def} onAdd={() => {}} />}
                          </>
                        )}
                      </Draggable>
                    ))}
                  </div>
                </div>
              )
            })}
            {provided.placeholder && <div className="hidden">{provided.placeholder}</div>}
          </div>
        )}
      </Droppable>
    </div>
  )
}
