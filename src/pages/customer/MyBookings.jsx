import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { customerApi } from '../../api'
import { errorMessage } from '../../api/client'
import { EmptyState, Modal, Spinner } from '../../components/ui'
import { formatAnswer, formatDate, formatMoney } from '../../lib/format'
import { DISPLAY_ONLY } from '../../lib/logic'
import { toast } from '../../store/uiSlice'

const STATUS_TEXT = { SUBMITTED: 'Confirmed', IN_PROGRESS: 'Not finished', ABANDONED: 'Not finished' }

function BookingDetail({ booking, onClose }) {
  const dispatch = useDispatch()
  const [data, setData] = useState(null)

  useEffect(() => {
    customerApi.booking(booking.form_id, booking.response_id).then(setData).catch((err) => dispatch(toast.error(errorMessage(err))))
  }, [booking, dispatch])

  return (
    <Modal open onClose={onClose} title={`Booking #${booking.response_id} · ${booking.form_name}`} size="max-w-2xl">
      {!data ? <div className="flex justify-center py-8"><Spinner /></div> : (
        <div className="space-y-5">
          {data.schema.pages.map((page) => {
            const fields = page.fields.filter((f) => !DISPLAY_ONLY.has(f.field_type) && data.answers[f.key] !== undefined)
            if (!fields.length) return null
            return (
              <section key={page.key}>
                <h3 className="mb-2 border-b border-slate-200 pb-1 text-sm font-semibold">{page.title}</h3>
                <dl className="space-y-2">
                  {fields.map((f) => (
                    <div key={f.key} className="grid gap-1 text-sm sm:grid-cols-[180px_1fr]">
                      <dt className="text-slate-500">{f.label}</dt>
                      <dd className="break-words">{formatAnswer(f, data.answers[f.key]) || '-'}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

export default function MyBookings() {
  const dispatch = useDispatch()
  const [bookings, setBookings] = useState(null)
  const [open, setOpen] = useState(null)

  useEffect(() => {
    customerApi.bookings().then(setBookings).catch((err) => dispatch(toast.error(errorMessage(err))))
  }, [dispatch])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My bookings</h1>
          <p className="text-sm text-slate-500">Everything you've booked, and anything you haven't finished yet.</p>
        </div>
        <Link to="/" className="btn-primary">+ Book a trip</Link>
      </div>

      {!bookings ? (
        <div className="flex justify-center py-16 text-brand-600"><Spinner className="h-8 w-8" /></div>
      ) : !bookings.length ? (
        <EmptyState icon="🧳" title="No bookings yet" action={<Link to="/" className="btn-primary">Browse trips</Link>}>
          When you book a trip it will show up here.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const done = b.status === 'SUBMITTED'
            const canContinue = !done && b.form_open && b.form_version === b.latest_version
            return (
              <div key={b.response_id} className="card flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{b.form_name}</h2>
                    <span className={`chip ${done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {done ? '✓ ' : '… '}{STATUS_TEXT[b.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Ref #{b.response_id} · {done ? `booked ${formatDate(b.submit_time)}` : `started ${formatDate(b.start_time)}`}
                    {b.amount_paid > 0 && <> · paid <span className="font-medium text-slate-700">{formatMoney(b.amount_paid, b.currency)}</span></>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary btn-sm" onClick={() => setOpen(b)}>View details</button>
                  {canContinue && <Link to={`/f/${b.share_id}`} className="btn-primary btn-sm">Continue →</Link>}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {open && <BookingDetail booking={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
