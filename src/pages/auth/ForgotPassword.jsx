import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../api'
import { errorMessage } from '../../api/client'
import { Spinner } from '../../components/ui'
import AuthShell from './AuthShell'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState({ loading: false, result: null, error: null })

  const submit = async (e) => {
    e.preventDefault()
    setState({ loading: true, result: null, error: null })
    try {
      setState({ loading: false, result: await authApi.forgotPassword(email), error: null })
    } catch (err) {
      setState({ loading: false, result: null, error: errorMessage(err) })
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a link to choose a new password.">
      {state.result ? (
        <div className="space-y-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
          <p>{state.result.message}</p>
          {state.result.reset_link && (
            <p>
              Demo mode: <a className="font-medium underline" href={state.result.reset_link.replace(/^https?:\/\/[^/]+/, '')}>open the reset link</a>
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {state.error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn-primary w-full" disabled={state.loading}>{state.loading && <Spinner className="h-4 w-4" />} Send reset link</button>
        </form>
      )}
      <p className="mt-4 text-center text-sm"><Link to="/login" className="text-brand-600 hover:underline">Back to log in</Link></p>
    </AuthShell>
  )
}
