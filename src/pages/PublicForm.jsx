import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useLocation, useParams } from 'react-router-dom'
import { formsApi, paymentsApi, responsesApi } from '../api'
import { errorMessage } from '../api/client'
import FormRenderer, { prefillAnswers } from '../components/renderer/FormRenderer'
import { PageSpinner } from '../components/ui'

const storageKey = (shareId) => `tf_resp_${shareId}`

function readSession(shareId) {
  try { return JSON.parse(localStorage.getItem(storageKey(shareId))) } catch { return null }
}

// Shared across StrictMode's double-invoked effects so only one response is started.
const pending = new Map()

async function loadSession(shareId, userId) {
  const form = await formsApi.publicForm(shareId)
  let session = readSession(shareId)
  let progress = null
  // Resume an unfinished response of the same version by the same person, otherwise start fresh.
  if (session && session.version === form.version && (session.user_id ?? null) === userId) {
    progress = await responsesApi.progress(form.form_id, session.response_id, session.session_id).catch(() => null)
    if (!progress || progress.status === 'SUBMITTED') progress = null
  }
  if (!progress) {
    // For a logged-in customer the server hands back their unfinished booking, if any.
    const started = await responsesApi.start(form.form_id, shareId)
    session = { response_id: started.response_id, session_id: started.session_id, version: started.form_version, user_id: userId }
    localStorage.setItem(storageKey(shareId), JSON.stringify(session))
    progress = await responsesApi.progress(form.form_id, started.response_id, started.session_id).catch(() => null)
  }
  return { form, session, progress }
}

/** Name / email pre-filled from the logged-in customer's profile. */
function profileAnswers(schema, user) {
  if (!user || user.role === 'ADMIN') return {}
  const fields = schema.pages.flatMap((p) => p.fields)
  const email = fields.find((f) => f.field_type === 'email')
  const name = fields.find((f) => f.field_type === 'text' && /^full name/i.test(f.label || ''))
  return { ...(email ? { [email.key]: user.email } : {}), ...(name ? { [name.key]: user.full_name } : {}) }
}

export default function PublicForm() {
  const { shareId } = useParams()
  const location = useLocation()
  const user = useSelector((s) => s.auth.user)
  const isCustomer = user && user.role !== 'ADMIN'
  const [state, setState] = useState({ loading: true, error: null })
  const [done, setDone] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        if (!pending.has(shareId)) pending.set(shareId, loadSession(shareId, user?.id ?? null).finally(() => setTimeout(() => pending.delete(shareId), 0)))
        const { form, session, progress } = await pending.get(shareId)
        if (cancelled) return
        const answers = { ...prefillAnswers(form.schema, location.search), ...profileAnswers(form.schema, user), ...(progress?.answers || {}) }
        const resumed = !!progress && (progress.current_page > 0 || Object.keys(progress.answers).length > 0)
        setState({ loading: false, form, session, answers, currentPage: progress?.current_page || 0, resumed })
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: errorMessage(err, 'This form could not be loaded') })
      }
    }
    init()
    return () => { cancelled = true }
    // user is read once on load; logging in/out elsewhere reloads this page anyway
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId, location.search])

  const backend = useMemo(() => {
    if (!state.session) return null
    const { form_id: formId } = state.form
    const { response_id: rid, session_id: sid } = state.session
    return {
      save: (answers, { currentPage, validatePage, pageTimes } = {}) => responsesApi.save(formId, rid, sid, {
        answers, current_page: currentPage, validate_page: validatePage, page_times: pageTimes,
      }),
      submit: (answers) => responsesApi.submit(formId, rid, sid, answers),
      uploader: (fieldKey) => ({
        upload: (file, onProgress) => responsesApi.upload(formId, rid, sid, fieldKey, file, onProgress),
        remove: (fileId) => responsesApi.removeFile(formId, rid, sid, fileId),
      }),
      payments: (fieldKey) => ({
        createOrder: () => paymentsApi.createOrder(sid, { form_id: formId, response_id: rid, field_key: fieldKey }),
        verify: (order, { payment_id, signature }) => paymentsApi.verify(sid, {
          form_id: formId, response_id: rid, order_id: order.order_id, payment_id, signature,
        }),
      }),
    }
  }, [state.form, state.session])

  const startOver = () => {
    localStorage.removeItem(storageKey(shareId))
    window.location.reload()
  }

  if (state.loading) return <PageSpinner />

  if (state.error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-md p-8 text-center">
          <p className="text-4xl">🧳</p>
          <h1 className="mt-2 text-lg font-semibold">Form unavailable</h1>
          <p className="mt-1 text-sm text-slate-500">{state.error}</p>
        </div>
      </div>
    )
  }

  const { schema } = state.form
  const color = schema.settings?.theme_color || '#2563eb'

  return (
    <div className="themed min-h-screen bg-slate-50" style={{ '--brand': color }}>
      <div className="h-2" style={{ background: color }} />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {isCustomer && (
          <nav className="mb-6 flex items-center justify-between text-sm">
            <Link to="/" className="text-slate-500 hover:text-slate-800">← All trips</Link>
            <Link to="/bookings" className="text-slate-500 hover:text-slate-800">My bookings</Link>
          </nav>
        )}
        <div className="mb-6">
          <h1 className="text-2xl font-bold sm:text-3xl">{schema.name}</h1>
          {schema.description && <p className="mt-2 text-slate-600">{schema.description}</p>}
        </div>
        <div className="card p-5 sm:p-8">
          {done ? (
            <div className="py-8 text-center">
              <div className="bg-theme mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white">✓</div>
              <h2 className="mt-4 text-xl font-semibold">Submitted!</h2>
              <p className="mx-auto mt-2 max-w-md text-slate-600">{done.confirmation_message}</p>
              <p className="mt-4 text-sm text-slate-500">Reference number <span className="font-mono font-semibold text-slate-800">#{done.response_id}</span></p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {isCustomer && <Link to="/bookings" className="btn btn-theme">View my bookings</Link>}
                <button className="btn-secondary" onClick={startOver}>Make another booking</button>
              </div>
            </div>
          ) : (
            <>
              {state.resumed && (
                <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  <span>Welcome back! We restored your saved progress.</span>
                  {/* a logged-in customer's unfinished booking is tied to their account, so it can't be discarded here */}
                  {!user && <button className="font-medium underline" onClick={startOver}>Start over</button>}
                </div>
              )}
              <FormRenderer
                schema={schema}
                backend={backend}
                initialAnswers={state.answers}
                initialPage={state.currentPage}
                onSubmitted={(result) => {
                  localStorage.removeItem(storageKey(shareId))
                  setDone(result)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            </>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Powered by ✈️ TripForms</p>
      </div>
    </div>
  )
}
