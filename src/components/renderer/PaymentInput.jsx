import { useState } from 'react'
import { errorMessage } from '../../api/client'
import { formatMoney } from '../../lib/format'
import { computePaymentAmount } from '../../lib/logic'
import { Modal, Spinner } from '../ui'

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = resolve
    s.onerror = () => reject(new Error('Could not load Razorpay checkout'))
    document.body.appendChild(s)
  })
}

/**
 * `payments` is null in preview mode. In live mode it exposes
 * createOrder() -> order and verify(order, {payment_id, signature}) -> payment.
 * The server recomputes the amount; the figure shown here is a preview.
 */
export default function PaymentInput({ field, value, onChange, visibleAnswers, payments, prefill }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [mockOrder, setMockOrder] = useState(null)
  const currency = field.config?.currency || 'INR'
  const amount = computePaymentAmount(field, visibleAnswers)
  const paid = value?.status === 'PAID'

  const finish = async (order, result) => {
    const payment = await payments.verify(order, result)
    onChange({ status: 'PAID', order_id: payment.order_id, payment_id: payment.payment_id, amount: payment.amount, currency: payment.currency })
  }

  const pay = async () => {
    setError(null)
    if (!payments) {
      onChange({ status: 'PAID', order_id: 'preview', payment_id: 'preview', amount, currency })
      return
    }
    setBusy(true)
    try {
      const order = await payments.createOrder()
      if (order.mock) {
        setMockOrder(order)
        return
      }
      await loadRazorpay()
      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.key_id,
          order_id: order.order_id,
          amount: order.amount_paise,
          currency: order.currency,
          name: order.form_name,
          description: order.description,
          prefill,
          handler: (res) => finish(order, { payment_id: res.razorpay_payment_id, signature: res.razorpay_signature }).then(resolve, reject),
          modal: { ondismiss: () => reject(new Error('Payment was cancelled')) },
        })
        rzp.on('payment.failed', (res) => reject(new Error(res.error?.description || 'Payment failed')))
        rzp.open()
      })
    } catch (err) {
      setError(err.response ? errorMessage(err) : err.message)
    } finally {
      setBusy(false)
    }
  }

  const confirmMock = async () => {
    setBusy(true)
    try {
      await finish(mockOrder, { payment_id: `pay_mock_${Date.now()}`, signature: 'mock_signature' })
      setMockOrder(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600">{field.config?.description || 'Amount due'}</p>
          <p className="text-2xl font-semibold">{formatMoney(paid ? value.amount : amount, currency)}</p>
          {field.config?.deposit_percent ? <p className="text-xs text-slate-500">{field.config.deposit_percent}% advance deposit</p> : null}
        </div>
        {paid ? (
          <span className="chip bg-emerald-100 px-3 py-1 text-sm text-emerald-800">✓ Paid · {value.payment_id}</span>
        ) : (
          <button type="button" className="btn btn-theme" onClick={pay} disabled={busy || amount <= 0}>
            {busy && <Spinner className="h-4 w-4" />} Pay {formatMoney(amount, currency)}
          </button>
        )}
      </div>
      {amount <= 0 && !paid && <p className="mt-2 text-xs text-slate-500">Complete the earlier questions to calculate the amount.</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-3 text-xs text-slate-400">🔒 Secured by Razorpay</p>

      <Modal
        open={!!mockOrder}
        onClose={() => { setMockOrder(null); setBusy(false) }}
        title="Demo payment"
        footer={(
          <>
            <button className="btn-secondary" onClick={() => { setMockOrder(null); setBusy(false) }}>Cancel</button>
            <button className="btn-primary" onClick={confirmMock} disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Simulate successful payment</button>
          </>
        )}
      >
        <p className="text-sm text-slate-600">
          Razorpay keys aren't configured on the server, so payments run in demo mode.
          Order <code className="rounded bg-slate-100 px-1">{mockOrder?.order_id}</code> for {formatMoney(mockOrder?.amount, mockOrder?.currency)} was created and will be verified server-side.
        </p>
      </Modal>
    </div>
  )
}
