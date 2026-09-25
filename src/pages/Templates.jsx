import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { formsApi, templatesApi } from '../api'
import { errorMessage } from '../api/client'
import { PreviewModal } from '../components/builder/BuilderModals'
import { EmptyState, Spinner } from '../components/ui'
import { toast } from '../store/uiSlice'

const META = {
  honeymoon: { icon: '💑', label: 'Honeymoon', tint: 'from-pink-500 to-rose-500' },
  group_booking: { icon: '👨‍👩‍👧‍👦', label: 'Group booking', tint: 'from-blue-500 to-indigo-500' },
  visa_form: { icon: '🛂', label: 'Visa form', tint: 'from-teal-500 to-emerald-600' },
  adventure: { icon: '🏔️', label: 'Adventure', tint: 'from-orange-500 to-amber-500' },
  payment_form: { icon: '💳', label: 'Payment form', tint: 'from-violet-500 to-purple-600' },
}

export default function Templates() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    templatesApi.list().then(setTemplates).catch((err) => dispatch(toast.error(errorMessage(err))))
  }, [dispatch])

  const use = async (t) => {
    setBusy(t.id)
    try {
      const form = await formsApi.fromTemplate(t.id)
      dispatch(toast.success(`Created "${form.name}" from template`))
      navigate(`/forms/${form.id}/builder`)
    } catch (err) {
      dispatch(toast.error(errorMessage(err)))
      setBusy(null)
    }
  }

  const openPreview = async (t) => {
    try {
      setPreview(await templatesApi.get(t.id))
    } catch (err) {
      dispatch(toast.error(errorMessage(err)))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Template library</h1>
        <p className="text-sm text-slate-500">Ready-made travel forms with validation, conditional logic and payments already set up. Duplicate and customise.</p>
      </div>
      {!templates ? (
        <div className="flex justify-center py-16 text-brand-600"><Spinner className="h-8 w-8" /></div>
      ) : !templates.length ? (
        <EmptyState title="No templates available" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const meta = META[t.category] || { icon: '📝', label: t.category, tint: 'from-slate-500 to-slate-700' }
            return (
              <div key={t.id} className="card flex flex-col overflow-hidden">
                <div className={`flex h-24 items-center justify-center bg-gradient-to-br text-5xl ${meta.tint}`}>{meta.icon}</div>
                <div className="flex flex-1 flex-col p-4">
                  <span className="chip w-fit bg-slate-100 text-slate-600">{meta.label}</span>
                  <h3 className="mt-2 font-semibold">{t.name}</h3>
                  <p className="mt-1 flex-1 text-sm text-slate-500">{t.description}</p>
                  <p className="mt-3 text-xs text-slate-500">{t.total_pages} pages · {t.total_fields} fields</p>
                  <div className="mt-4 flex gap-2">
                    <button className="btn-secondary btn-sm flex-1" onClick={() => openPreview(t)}>Preview</button>
                    <button className="btn-primary btn-sm flex-1" onClick={() => use(t)} disabled={busy === t.id}>
                      {busy === t.id && <Spinner className="h-3 w-3" />} Use template
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <PreviewModal open={!!preview} onClose={() => setPreview(null)} schema={preview?.schema} title={preview?.name} />
    </div>
  )
}
