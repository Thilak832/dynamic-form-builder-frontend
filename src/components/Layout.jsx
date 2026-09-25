import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../store/authSlice'

export default function Layout() {
  const user = useSelector((s) => s.auth.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = user?.role === 'ADMIN'
    ? [{ to: '/', label: 'Forms', end: true }, { to: '/templates', label: 'Templates' }, { to: '/admin', label: 'Admin' }]
    : [{ to: '/', label: 'Book a trip', end: true }, { to: '/bookings', label: 'My bookings' }]

  const onLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  const linkClass = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-white/15 text-white' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-brand-900 shadow">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold text-white">
            <span className="text-xl">✈️</span> TripForms
          </Link>
          <nav className="hidden flex-1 gap-1 sm:flex">
            {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>{l.label}</NavLink>)}
          </nav>
          <div className="ml-auto hidden items-center gap-3 sm:flex">
            <Link to="/profile" className="text-right text-xs text-blue-100 hover:text-white">
              <div className="font-medium text-white">{user?.full_name}</div>
              <div>{user?.role === 'ADMIN' ? 'Admin' : 'Customer'}</div>
            </Link>
            <button onClick={onLogout} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white hover:bg-white/10">Log out</button>
          </div>
          <button className="ml-auto text-2xl text-white sm:hidden" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">☰</button>
        </div>
        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-white/10 px-4 py-3 sm:hidden" onClick={() => setMenuOpen(false)}>
            {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>{l.label}</NavLink>)}
            <NavLink to="/profile" className={linkClass}>Profile</NavLink>
            <button onClick={onLogout} className="rounded-lg px-3 py-2 text-left text-sm text-blue-100 hover:bg-white/10">Log out</button>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
