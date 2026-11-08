import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { Skeleton } from '../components/ui'

export default function RequireAuth() {
  const { session, profile, loading, signOut } = useAuth()
  const loc = useLocation()

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center">
        <Skeleton className="h-10 w-48" />
      </div>
    )
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (!profile || !profile.is_active)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="mb-4 font-bold">الحساب غير مفعّل أو غير مرتبط بملف مستخدم. تواصل مع مدير النظام.</p>
          <button onClick={signOut} className="rounded-xl bg-brand px-4 py-2 font-bold text-white">تسجيل الخروج</button>
        </div>
      </div>
    )
  return <Outlet />
}
