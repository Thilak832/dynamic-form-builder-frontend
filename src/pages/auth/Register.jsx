import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { Spinner } from '../../components/ui'
import { clearError, register } from '../../store/authSlice'
import AuthShell from './AuthShell'

export default function Register() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const { loading, error } = useSelector((s) => s.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => () => { dispatch(clearError()) }, [dispatch])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    const res = await dispatch(register(form))
    if (res.meta.requestStatus === 'fulfilled') navigate('/', { replace: true })
  }

  return (
    <AuthShell title="Create your account" subtitle="Book trips and keep track of all your bookings in one place.">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" required className="input" value={form.full_name} onChange={set('full_name')} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={form.email} onChange={set('email')} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={8} className="input" value={form.password} onChange={set('password')} />
          <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
        </div>
        <button className="btn-primary w-full" disabled={loading}>{loading && <Spinner className="h-4 w-4" />} Create account</button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account? <Link to="/login" className="font-medium text-brand-600 hover:underline">Log in</Link>
      </p>
    </AuthShell>
  )
}
