import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { customerApi } from '../../api'
import { errorMessage } from '../../api/client'
import { EmptyState, Spinner } from '../../components/ui'
import { toast } from '../../store/uiSlice'

/** Customer home: every published booking form, ready to fill. */
export default function Catalog() {
  const user = useSelector((s) => s.auth.user)
  const dispatch = useDispatch()
  const [forms, setForms] = useState(null)
  const [inProgress, setInProgress] = useState({})

  useEffect(() => {
    customerApi.catalog().then(setForms).catch((err) => dispatch(toast.error(errorMessage(err))))
    customerApi.bookings()
      .then((bookings) => setInProgress(Object.fromEntries(bookings.filter((b) => b.status !== 'SUBMITTED').map((b) => [b.form_id, b]))))
      .catch(() => null)
  }, [dispatch])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-sky-600 p-6 text-white sm:p-8">
        <p className="text-sm text-blue-100">Hi {user.full_name.split(' ')[0]} 👋</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Where would you like to go?</h1>
        <p className="mt-2 max-w-xl text-blue-100">Pick a package below and fill in the booking form. Your progress saves automatically, so you can finish later from any device.</p>
        <Link to="/bookings" className="mt-4 inline-block rounded-lg bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25">View my bookings →</Link>
      </div>

      {!forms ? (
        <div className="flex justify-center py-16 text-brand-600"><Spinner className="h-8 w-8" /></div>
      ) : !forms.length ? (
        <EmptyState icon="🧳" title="No trips open for booking right now">Please check back soon.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((f) => {
            const draft = inProgress[f.id]
            return (
              <div key={f.id} className="card flex flex-col overflow-hidden">
                <div className="h-2" style={{ background: f.theme_color }} />
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-semibold">{f.name}</h2>
                  <p className="mt-1 flex-1 text-sm text-slate-500">{f.description || 'Booking form'}</p>
                  <p className="mt-3 text-xs text-slate-500">{f.total_pages} step{f.total_pages === 1 ? '' : 's'}</p>
                  {draft && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">You have an unfinished booking here</p>}
                  <Link to={`/f/${f.share_id}`} className="btn mt-4 text-white" style={{ background: f.theme_color }}>
                    {draft ? 'Continue booking' : 'Book now'} →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
