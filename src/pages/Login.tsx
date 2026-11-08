import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export default function Login() {
  const { session, profile, signIn } = useAuth()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session && profile) return <Navigate to={(loc.state as { from?: string } | null)?.from ?? '/'} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(await signIn(email, password))
    setBusy(false)
  }

  return (
    <div className="grid min-h-screen place-items-center bg-linear-to-br from-nav to-brand p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-sky-50 text-3xl font-bold text-brand">✓</div>
          <h1 className="m-0 text-lg font-bold">منصة ضمان الجودة</h1>
          <small className="text-muted">مستشفيات جامعة كفر الشيخ</small>
        </div>
        <label className="mb-1 block text-xs text-muted">البريد الإلكتروني</label>
        <input
          type="email" required autoComplete="username" dir="ltr" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-xl border border-line p-3 outline-brand-2"
        />
        <label className="mb-1 block text-xs text-muted">كلمة المرور</label>
        <input
          type="password" required autoComplete="current-password" dir="ltr" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-xl border border-line p-3 outline-brand-2"
        />
        {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-center text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-brand p-3 font-bold text-white disabled:opacity-60">
          {busy ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
        </button>
      </form>
    </div>
  )
}
