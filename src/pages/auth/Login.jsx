import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Spinner } from '../../components/ui'
import { clearError, login } from '../../store/authSlice'
import AuthShell from './AuthShell'

const DEMO = [
  { label: 'Admin', email: 'admin@demo.com' },
  { label: 'Customer', email: 'customer@demo.com' },
]

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const { loading, error } = useSelector((s) => s.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => () => { dispatch(clearError()) }, [dispatch])

  const submit = async (e) => {
    e.preventDefault()
    const res = await dispatch(login(form))
    if (res.meta.requestStatus === 'fulfilled') navigate(location.state?.from || '/', { replace: true })
  }

  return (
    <AuthShell title="Welcome back" subtitle="Admins manage booking forms. Customers book trips and track their bookings.">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" className="input" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">Password</label>
            <Link to="/forgot-password" className="text-xs text-brand-600 hover:underline">Forgot password?</Link>
          </div>
          <input id="password" type="password" required autoComplete="current-password" className="input" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn-primary w-full" disabled={loading}>{loading && <Spinner className="h-4 w-4" />} Log in</button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        New here? <Link to="/register" className="font-medium text-brand-600 hover:underline">Create an account</Link>
      </p>
      <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-3">
        <p className="text-xs font-medium text-slate-500">Demo accounts (password: demo1234, after running seed.py)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEMO.map((d) => (
            <button key={d.email} type="button" className="btn-secondary btn-sm" onClick={() => setForm({ email: d.email, password: 'demo1234' })}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  )
}
