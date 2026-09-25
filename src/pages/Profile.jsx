import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { authApi } from '../api'
import { errorMessage } from '../api/client'
import { refreshUser } from '../store/authSlice'
import { toast } from '../store/uiSlice'

export default function Profile() {
  const user = useSelector((s) => s.auth.user)
  const dispatch = useDispatch()
  const [form, setForm] = useState({ full_name: user.full_name })
  const [saving, setSaving] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await authApi.updateMe(form)
      await dispatch(refreshUser())
      dispatch(toast.success('Profile updated'))
    } catch (err) {
      dispatch(toast.error(errorMessage(err)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold">Profile</h1>
      <form onSubmit={save} className="card mt-4 space-y-4 p-5">
        <div>
          <label className="label">Email</label>
          <input className="input" value={user.email} disabled />
        </div>
        <div>
          <label className="label">Full name</label>
          <input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <p className="text-sm text-slate-500">Account type: <span className="font-medium text-slate-700">{user.role === 'ADMIN' ? 'Admin' : 'Customer'}</span></p>
        {user.role !== 'ADMIN' && <p className="text-xs text-slate-500">Your name and email are filled in automatically when you book.</p>}
        <button className="btn-primary" disabled={saving}>Save</button>
      </form>
    </div>
  )
}
