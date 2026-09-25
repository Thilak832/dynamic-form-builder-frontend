export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-brand-900 via-brand-800 to-sky-600 p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold"><span className="text-2xl">✈️</span> TripForms</div>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">Booking forms for every journey - without writing code.</h2>
          <ul className="mt-6 space-y-2 text-blue-100">
            <li>• Drag-and-drop builder with 30+ field types</li>
            <li>• Multi-page flows with conditional logic</li>
            <li>• Document uploads and Razorpay deposits</li>
            <li>• Response analytics and Excel export</li>
          </ul>
        </div>
        <p className="text-sm text-blue-200">Honeymoons, treks, group tours, visas.</p>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 text-lg font-semibold text-brand-900 lg:hidden"><span className="text-2xl">✈️</span> TripForms</div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
