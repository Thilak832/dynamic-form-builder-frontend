import { lazy, Suspense } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { PageSpinner, Toasts } from './components/ui'

const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Builder = lazy(() => import('./pages/Builder'))
const Responses = lazy(() => import('./pages/Responses'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Templates = lazy(() => import('./pages/Templates'))
const Admin = lazy(() => import('./pages/Admin'))
const PublicForm = lazy(() => import('./pages/PublicForm'))
const Profile = lazy(() => import('./pages/Profile'))
const Catalog = lazy(() => import('./pages/customer/Catalog'))
const MyBookings = lazy(() => import('./pages/customer/MyBookings'))

function RequireAuth({ children, role }) {
  const user = useSelector((s) => s.auth.user)
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

function GuestOnly({ children }) {
  const user = useSelector((s) => s.auth.user)
  return user ? <Navigate to="/" replace /> : children
}

/** Admins land on their forms dashboard, customers on the trip catalog. */
function Home() {
  const role = useSelector((s) => s.auth.user?.role)
  return role === 'ADMIN' ? <Dashboard /> : <Catalog />
}

const admin = (el) => <RequireAuth role="ADMIN">{el}</RequireAuth>

export default function App() {
  return (
    <>
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/f/:shareId" element={<PublicForm />} />

          <Route path="/forms/:id/builder" element={admin(<Builder />)} />
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Home />} />
            <Route path="/bookings" element={<MyBookings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/templates" element={admin(<Templates />)} />
            <Route path="/forms/:id/responses" element={admin(<Responses />)} />
            <Route path="/forms/:id/analytics" element={admin(<Analytics />)} />
            <Route path="/admin" element={admin(<Admin />)} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toasts />
    </>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl">🧭</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <a className="btn-primary" href="/">Back home</a>
    </div>
  )
}
