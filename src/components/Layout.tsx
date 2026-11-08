import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { ROLE_LABELS } from '../lib/constants'

const NAV: { to: string; label: string; title: string; end?: boolean }[] = [
  { to: '/', label: '▦ لوحة المتابعة', title: 'لوحة متابعة الجودة', end: true },
  { to: '/departments', label: '🏥 الأقسام', title: 'الأقسام' },
  { to: '/assessments', label: '☷ التقييمات', title: 'سجل التقييمات' },
  { to: '/reports', label: '◫ التقارير', title: 'التقارير' },
]
const ADMIN_NAV: (typeof NAV)[number] = { to: '/admin', label: '⚙ الإدارة', title: 'الإدارة' }

export default function Layout() {
  const { profile, signOut } = useAuth()
  const { pathname } = useLocation()
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'quality_admin'
  const items: typeof NAV = isAdmin ? [...NAV, ADMIN_NAV] : NAV
  const title = items.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))?.title ?? 'منصة ضمان الجودة'

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[255px_1fr] print:block">
      <aside className="print:hidden bg-linear-to-b from-nav to-brand p-4 text-white lg:sticky lg:top-0 lg:h-screen">
        <div className="flex items-center gap-3 border-b border-white/15 pb-5">
          <div className="grid size-12 place-items-center rounded-2xl bg-white text-2xl font-bold text-brand">✓</div>
          <div>
            <b className="text-sm">منصة ضمان الجودة</b>
            <small className="mt-1 block text-sky-100">مستشفيات جامعة كفر الشيخ</small>
          </div>
        </div>
        <nav className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(70px,1fr))] gap-2 lg:grid-cols-1">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `rounded-xl p-3 text-center text-xs lg:text-start lg:text-sm ${isActive ? 'bg-white/20 text-white' : 'text-sky-100 hover:bg-white/10'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0">
        <header className="print:hidden sticky top-0 z-10 flex h-[74px] items-center justify-between border-b border-line bg-white px-4 lg:px-6">
          <div>
            <h2 className="m-0 text-lg font-bold lg:text-xl">{title}</h2>
            <small className="text-muted">نظام تقييم ومتابعة الالتزام</small>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-end leading-tight">
              <div className="text-sm font-bold">{profile?.full_name || profile?.email}</div>
              <small className="text-muted">{profile ? ROLE_LABELS[profile.role] : ''}</small>
            </div>
            <button onClick={signOut} className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-brand hover:bg-sky-100">
              خروج
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
