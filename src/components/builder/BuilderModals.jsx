import { QRCodeCanvas } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { formsApi } from '../../api'
import { errorMessage } from '../../api/client'
import { formatDate } from '../../lib/format'
import { builder, serializeForm } from '../../store/builderSlice'
import { toast } from '../../store/uiSlice'
import FormRenderer, { prefillAnswers } from '../renderer/FormRenderer'
import { Modal, Spinner } from '../ui'

const COLORS = ['#2563eb', '#db2777', '#0f766e', '#ea580c', '#7c3aed', '#0f172a', '#16a34a', '#dc2626']

export function SettingsModal({ open, onClose }) {
  const dispatch = useDispatch()
  const form = useSelector((s) => s.builder.form)
  const s = form.settings || {}
  const set = (patch) => dispatch(builder.setSettings(patch))

  return (
    <Modal open={open} onClose={onClose} title="Form settings" footer={<button className="btn-primary" onClick={onClose}>Done</button>}>
      <div className="space-y-4">
        <div>
          <label className="label">Form name</label>
          <input className="input" value={form.name} onChange={(e) => dispatch(builder.setMeta({ name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea rows={2} className="input" value={form.description || ''} onChange={(e) => dispatch(builder.setMeta({ description: e.target.value }))} />
        </div>
        <div>
          <label className="label">Theme colour</label>
          <div className="flex flex-wrap items-center gap-2">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => set({ theme_color: c })} aria-label={`Theme ${c}`}
                className={`h-8 w-8 rounded-full ring-offset-2 ${(s.theme_color || '#2563eb') === c ? 'ring-2 ring-slate-900' : ''}`} style={{ background: c }} />
            ))}
            <input type="color" className="h-8 w-10 cursor-pointer rounded border border-slate-300" value={s.theme_color || '#2563eb'} onChange={(e) => set({ theme_color: e.target.value })} aria-label="Custom colour" />
          </div>
        </div>
        <div>
          <label className="label">Confirmation message</label>
          <textarea rows={3} className="input" value={s.confirmation_message || ''} placeholder="Thank you! Your booking request has been received."
            onChange={(e) => set({ confirmation_message: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={s.send_confirmation_email !== false} onChange={(e) => set({ send_confirmation_email: e.target.checked })} />
          Email a confirmation to the respondent (uses the first Email field)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={s.notify_owner !== false} onChange={(e) => set({ notify_owner: e.target.checked })} />
          Email me when a new response is submitted
        </label>
      </div>
    </Modal>
  )
}

export function ShareModal({ open, onClose, form }) {
  const dispatch = useDispatch()
  const qrRef = useRef(null)
  const url = `${window.location.origin}/f/${form.share_id}`
  const embed = `<iframe src="${url}" width="100%" height="900" style="border:0"></iframe>`

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text)
      dispatch(toast.success(`${what} copied`))
    } catch {
      dispatch(toast.error('Copy failed - select the text and copy manually'))
    }
  }
  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `${form.name.replace(/\W+/g, '_')}_qr.png`
    a.click()
  }

  return (
    <Modal open={open} onClose={onClose} title="Share form">
      {form.version === 0 ? (
        <p className="text-sm text-slate-600">Publish this form first to get a shareable link.</p>
      ) : (
        <div className="space-y-5">
          {form.status === 'ARCHIVED' && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">This form is archived and isn't accepting responses.</p>}
          <div>
            <label className="label">Public link</label>
            <div className="flex gap-2">
              <input className="input font-mono text-xs" readOnly value={url} onFocus={(e) => e.target.select()} />
              <button className="btn-secondary" onClick={() => copy(url, 'Link')}>Copy</button>
            </div>
            <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-brand-600 hover:underline">Open form ↗</a>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row">
            <div ref={qrRef} className="rounded-lg bg-white p-2"><QRCodeCanvas value={url} size={148} includeMargin /></div>
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-800">QR code</p>
              <p className="mt-1">Print it on brochures or show it at your travel desk - customers scan to book.</p>
              <button className="btn-secondary btn-sm mt-3" onClick={downloadQr}>Download PNG</button>
            </div>
          </div>
          <div>
            <label className="label">Embed on your website</label>
            <div className="flex gap-2">
              <input className="input font-mono text-xs" readOnly value={embed} onFocus={(e) => e.target.select()} />
              <button className="btn-secondary" onClick={() => copy(embed, 'Embed code')}>Copy</button>
            </div>
          </div>
          <p className="text-xs text-slate-500">Tip: prefill answers with URL parameters, e.g. <code className="rounded bg-slate-100 px-1">{url}?field_key=value</code> (keys are shown in each field's settings).</p>
        </div>
      )}
    </Modal>
  )
}

export function VersionsModal({ open, onClose, formId, onRestored, canEdit }) {
  const dispatch = useDispatch()
  const [versions, setVersions] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    if (!open) return
    setVersions(null)
    formsApi.versions(formId).then(setVersions).catch((err) => dispatch(toast.error(errorMessage(err))))
  }, [open, formId, dispatch])

  const restore = async (v) => {
    if (!window.confirm(`Replace the current draft with version ${v}? Unsaved changes will be lost. (Publish again to make it live.)`)) return
    setBusy(v)
    try {
      onRestored(await formsApi.restoreVersion(formId, v))
      dispatch(toast.success(`Version ${v} restored to the draft`))
      onClose()
    } catch (err) {
      dispatch(toast.error(errorMessage(err)))
    } finally {
      setBusy(null)
    }
  }

  const showPreview = async (v) => setPreview(await formsApi.version(formId, v))

  return (
    <>
      <Modal open={open && !preview} onClose={onClose} title="Version history" size="max-w-2xl">
        {!versions ? <div className="flex justify-center py-8"><Spinner /></div> : !versions.length ? (
          <p className="text-sm text-slate-500">No published versions yet. Every time you publish, a snapshot is saved here. Respondents always see the latest published version.</p>
        ) : (
          <ol className="space-y-2">
            {versions.map((v, i) => (
              <li key={v.version} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">v{v.version}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{v.note || `Version ${v.version}`} {i === 0 && <span className="chip ml-1 bg-emerald-100 text-emerald-800">Live</span>}</p>
                  <p className="text-xs text-slate-500">{formatDate(v.published_at, true)} · {v.published_by || 'unknown'} · {v.total_pages} pages · {v.total_fields} fields · {v.responses} responses</p>
                </div>
                <button className="btn-ghost btn-sm" onClick={() => showPreview(v.version)}>Preview</button>
                {canEdit && <button className="btn-secondary btn-sm" disabled={busy === v.version} onClick={() => restore(v.version)}>Restore</button>}
              </li>
            ))}
          </ol>
        )}
      </Modal>
      <PreviewModal open={!!preview} onClose={() => setPreview(null)} schema={preview?.schema} title={`Version ${preview?.version} preview`} />
    </>
  )
}

export function PreviewModal({ open, onClose, schema, title = 'Preview' }) {
  const [device, setDevice] = useState('desktop')
  const [done, setDone] = useState(null)
  const [runKey, setRunKey] = useState(0)
  if (!open || !schema) return null
  const color = schema.settings?.theme_color || '#2563eb'
  const restart = () => { setDone(null); setRunKey((k) => k + 1) }

  return (
    <Modal open={open} onClose={() => { restart(); onClose() }} title={title} size="max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {['desktop', 'mobile'].map((d) => (
          <button key={d} className={device === d ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'} onClick={() => setDevice(d)}>
            {d === 'desktop' ? '🖥 Desktop' : '📱 Mobile'}
          </button>
        ))}
        <button className="btn-ghost btn-sm" onClick={restart}>↺ Restart</button>
        <span className="ml-auto text-xs text-slate-500">Preview mode - nothing is saved, payments are simulated.</span>
      </div>
      <div className="themed rounded-xl bg-slate-100 p-3 sm:p-6" style={{ '--brand': color }}>
        <div className={`mx-auto rounded-xl bg-white p-5 shadow-sm transition-all ${device === 'mobile' ? 'max-w-[380px]' : 'max-w-2xl'}`}>
          <h2 className="mb-4 text-xl font-bold">{schema.name}</h2>
          {done ? (
            <div className="py-10 text-center">
              <div className="bg-theme mx-auto flex h-12 w-12 items-center justify-center rounded-full text-xl text-white">✓</div>
              <p className="mt-3 text-slate-600">{done.confirmation_message}</p>
              <button className="btn-secondary mt-4" onClick={restart}>Fill again</button>
            </div>
          ) : (
            <FormRenderer key={runKey} schema={schema} initialAnswers={prefillAnswers(schema)} onSubmitted={setDone} />
          )}
        </div>
      </div>
    </Modal>
  )
}

export function PublishModal({ open, onClose, onPublished, form }) {
  const dispatch = useDispatch()
  const dirty = useSelector((s) => s.builder.dirty)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState(null)

  const publish = async () => {
    setBusy(true)
    setErrors(null)
    try {
      if (dirty) {
        const saved = await formsApi.update(form.id, serializeForm(form))
        dispatch(builder.markSaved(saved))
      }
      const published = await formsApi.publish(form.id, note || null)
      dispatch(builder.markSaved(published))
      dispatch(toast.success(`Version ${published.version} is live`))
      setNote('')
      onPublished(published)
    } catch (err) {
      const list = err?.response?.data?.detail?.errors
      if (Array.isArray(list)) setErrors(list)
      else dispatch(toast.error(errorMessage(err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={form.version ? `Publish version ${form.version + 1}` : 'Publish form'}
      footer={(
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={publish} disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Publish</button>
        </>
      )}
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Publishing makes the current draft live at the public link. {form.version ? 'People already filling the previous version can finish it; new visitors get this one.' : ''}
        </p>
        <div>
          <label className="label">What changed? <span className="font-normal text-slate-400">(optional)</span></label>
          <input className="input" value={note} maxLength={500} placeholder="e.g. Added group discount options" onChange={(e) => setNote(e.target.value)} />
        </div>
        {errors && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <p className="font-medium">Fix these before publishing:</p>
            <ul className="mt-1 list-disc pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}
      </div>
    </Modal>
  )
}
