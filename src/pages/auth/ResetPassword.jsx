import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../../api'
import { errorMessage } from '../../api/client'
import { Spinner } from '../../components/ui'
import AuthShell from './AuthShell'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [state, setState] = useState({ loading: false, done: false, error: null })

  const submit = async (e) => {
    e.preventDefault()
    setState({ loading: true, done: false, error: null })
    try {
      await authApi.resetPassword(params.get('token') || '', password)
      setState({ loading: false, done: true, error: null })
    } catch (err) {
      setState({ loading: false, done: false, error: errorMessage(err) })
    }
  }

  return (
    <AuthShell title="Choose a new password">
      {state.done ? (
        <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
          Password updated. <Link to="/login" className="font-medium underline">Log in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {state.error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>}
          <div>
            <label className="label" htmlFor="password">New password</label>
            <input id="password" type="password" minLength={8} required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn-primary w-full" disabled={state.loading}>{state.loading && <Spinner className="h-4 w-4" />} Update password</button>
        </form>
      )}
    </AuthShell>
  )
}
