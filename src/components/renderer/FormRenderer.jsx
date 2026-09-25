import debounce from 'lodash/debounce'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fieldErrors, errorMessage } from '../../api/client'
import { computeVisibility, DISPLAY_ONLY, validateAnswers } from '../../lib/logic'
import { Spinner } from '../ui'
import FieldInput from './FieldInput'

/**
 * Renders a form schema as a multi-page wizard.
 *
 * `backend` (live mode) persists progress and submits:
 *   save(answers, {currentPage, validatePage, pageTimes}) / submit(answers) / uploader(key) / payments(key)
 * Without a backend (builder preview / template preview) everything stays local.
 */
export default function FormRenderer({ schema, backend = null, initialAnswers = {}, initialPage = 0, onSubmitted }) {
  const [answers, setAnswers] = useState(initialAnswers)
  const [pageKey, setPageKey] = useState(() => schema.pages[Math.min(initialPage, schema.pages.length - 1)]?.key)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState(null)
  const [saveState, setSaveState] = useState(null) // 'saving' | 'saved' | null
  const pageEnteredAt = useRef(Date.now())
  const topRef = useRef(null)

  const visibility = useMemo(() => computeVisibility(schema, answers), [schema, answers])
  const visiblePages = schema.pages.filter((p) => visibility.pages.has(p.key))
  const pageIdx = Math.max(0, visiblePages.findIndex((p) => p.key === pageKey))
  const page = visiblePages[pageIdx] || visiblePages[0]
  const isLast = pageIdx >= visiblePages.length - 1
  const visibleAnswers = useMemo(
    () => Object.fromEntries(Object.entries(answers).filter(([k]) => visibility.fields.has(k))),
    [answers, visibility],
  )

  // If the current page became hidden (answer changed elsewhere), fall back to a visible page.
  useEffect(() => {
    if (page && page.key !== pageKey) setPageKey(page.key)
  }, [page, pageKey])

  // Autosave (save & resume) - debounced, live mode only.
  const autosave = useMemo(() => (backend ? debounce(async (data, current) => {
    setSaveState('saving')
    try {
      await backend.save(data, { currentPage: current })
      setSaveState('saved')
    } catch {
      setSaveState(null)
    }
  }, 1500) : null), [backend])
  useEffect(() => () => autosave?.cancel(), [autosave])

  const pageNumber = page ? schema.pages.findIndex((p) => p.key === page.key) : 0

  const setValue = useCallback((key, value) => {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value }
      autosave?.(next, pageNumber)
      return next
    })
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }, [autosave, pageNumber])

  const takePageTime = () => {
    const secs = (Date.now() - pageEnteredAt.current) / 1000
    pageEnteredAt.current = Date.now()
    return page ? { [page.key]: Math.round(secs * 10) / 10 } : {}
  }

  const scrollToError = (errs) => {
    const first = Object.keys(errs).find((k) => errs[k])
    if (first) document.getElementById(`field_${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const goTo = (target) => {
    setPageKey(target.key)
    setErrors({})
    setFormError(null)
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const next = async () => {
    const errs = validateAnswers(schema, answers, page.key)
    if (Object.keys(errs).length) {
      setErrors(errs)
      scrollToError(errs)
      return
    }
    const target = visiblePages[pageIdx + 1]
    if (backend) {
      setBusy(true)
      autosave?.cancel()
      try {
        await backend.save(answers, {
          currentPage: schema.pages.findIndex((p) => p.key === target.key),
          validatePage: page.key,
          pageTimes: takePageTime(),
        })
      } catch (err) {
        const fe = fieldErrors(err)
        if (fe) { setErrors(fe); scrollToError(fe) } else setFormError(errorMessage(err))
        return
      } finally {
        setBusy(false)
      }
    }
    goTo(target)
  }

  const back = () => {
    if (pageIdx === 0) return
    const target = visiblePages[pageIdx - 1]
    if (backend) backend.save(answers, { currentPage: schema.pages.findIndex((p) => p.key === target.key), pageTimes: takePageTime() }).catch(() => null)
    goTo(target)
  }

  const submit = async () => {
    const errs = validateAnswers(schema, answers)
    if (Object.keys(errs).length) {
      setErrors(errs)
      const errPage = visiblePages.find((p) => p.fields.some((f) => errs[f.key]))
      if (errPage && errPage.key !== page.key) setPageKey(errPage.key)
      setTimeout(() => scrollToError(errs), 50)
      return
    }
    setBusy(true)
    setFormError(null)
    autosave?.cancel()
    try {
      if (backend) await backend.save(answers, { pageTimes: takePageTime() })
      const result = backend ? await backend.submit(answers) : { confirmation_message: schema.settings?.confirmation_message || 'Preview submitted - nothing was saved.' }
      onSubmitted?.(result)
    } catch (err) {
      const fe = fieldErrors(err)
      if (fe) {
        setErrors(fe)
        const errPage = visiblePages.find((p) => p.fields.some((f) => fe[f.key]))
        if (errPage) setPageKey(errPage.key)
        setTimeout(() => scrollToError(fe), 50)
      } else {
        setFormError(errorMessage(err))
      }
    } finally {
      setBusy(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') {
      e.preventDefault()
      if (isLast) submit()
      else next()
    }
  }

  if (!page) return <p className="p-6 text-center text-slate-500">This form has no pages yet.</p>

  const nameField = schema.pages.flatMap((p) => p.fields).find((f) => f.field_type === 'text' && /name/i.test(f.label))
  const emailField = schema.pages.flatMap((p) => p.fields).find((f) => f.field_type === 'email')
  const ctx = {
    answers,
    visibleAnswers,
    uploader: backend?.uploader,
    // The server prices orders from saved answers, so flush pending edits first.
    payments: backend && ((key) => ({
      createOrder: async () => {
        autosave?.cancel()
        await backend.save(answers, { currentPage: pageNumber })
        return backend.payments(key).createOrder()
      },
      verify: backend.payments(key).verify,
    })),
    prefill: { name: answers[nameField?.key] || '', email: answers[emailField?.key] || '' },
  }
  const progress = Math.round(((pageIdx + 1) / visiblePages.length) * 100)

  return (
    <div ref={topRef} onKeyDown={onKeyDown}>
      {visiblePages.length > 1 && page.show_progress_bar !== false && (
        <div className="mb-6">
          <div className="mb-1.5 flex justify-between text-xs text-slate-500">
            <span>Step {pageIdx + 1} of {visiblePages.length}</span>
            <span>{progress}% complete</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="bg-theme h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 hidden gap-2 sm:flex">
            {visiblePages.map((p, i) => (
              <span key={p.key} className={`flex-1 truncate text-center text-xs ${i === pageIdx ? 'text-theme font-semibold' : i < pageIdx ? 'text-slate-600' : 'text-slate-400'}`}>
                {i < pageIdx ? '✓ ' : ''}{p.title}
              </span>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold">{page.title}</h2>
      {page.description && <p className="mt-1 text-sm text-slate-500">{page.description}</p>}

      <div className="mt-6 space-y-6">
        {page.fields.filter((f) => visibility.fields.has(f.key)).map((field) => (
          <div key={field.key} id={`field_${field.key}`}>
            {!DISPLAY_ONLY.has(field.field_type) && field.field_type !== 'terms' && (
              <label htmlFor={`f_${field.key}`} className="label">
                {field.label}{(field.required || page.required_all_fields) && <span className="text-red-500"> *</span>}
              </label>
            )}
            <FieldInput field={field} value={answers[field.key]} onChange={(v) => setValue(field.key, v)} error={errors[field.key]} ctx={ctx} />
            {field.help_text && <p className="mt-1 text-xs text-slate-500">{field.help_text}</p>}
            {errors[field.key] && <p id={`f_${field.key}_err`} className="mt-1 text-sm text-red-600" role="alert">{errors[field.key]}</p>}
          </div>
        ))}
      </div>

      {formError && <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>}

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
        <button type="button" className="btn-secondary" onClick={back} disabled={pageIdx === 0 || busy}>← Back</button>
        <span className="hidden text-xs text-slate-400 sm:block">
          {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? '✓ Progress saved - you can come back later' : ''}
        </span>
        {isLast ? (
          <button type="button" className="btn btn-theme" onClick={submit} disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Submit</button>
        ) : (
          <button type="button" className="btn btn-theme" onClick={next} disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Next →</button>
        )}
      </div>
    </div>
  )
}

/** Answers pre-filled from field defaults and URL query parameters (?field_key=value). */
export function prefillAnswers(schema, search = '') {
  const params = new URLSearchParams(search)
  const answers = {}
  for (const page of schema.pages) {
    for (const field of page.fields) {
      if (DISPLAY_ONLY.has(field.field_type) || field.field_type === 'payment') continue
      if (field.config?.default_value !== undefined && field.config.default_value !== '') answers[field.key] = field.config.default_value
      if (!params.has(field.key)) continue
      const raw = params.get(field.key)
      if (['number', 'currency', 'slider', 'rating'].includes(field.field_type)) answers[field.key] = Number(raw)
      else if (['multi_select', 'checkbox'].includes(field.field_type)) answers[field.key] = raw.split(',')
      else if (field.field_type === 'toggle') answers[field.key] = raw === 'true'
      else if (['text', 'email', 'phone', 'textarea', 'dropdown', 'radio', 'date', 'time', 'country', 'state', 'city', 'postal_code', 'url', 'social'].includes(field.field_type)) answers[field.key] = raw
    }
  }
  return answers
}
