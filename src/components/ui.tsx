import type { ReactNode } from 'react'
import { THRESHOLDS } from '../lib/constants'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

export type Tone = 'good' | 'warn' | 'bad' | 'none'
export const toneOf = (p: number | null | undefined): Tone =>
  p == null ? 'none' : p >= THRESHOLDS.good ? 'good' : p >= THRESHOLDS.warn ? 'warn' : 'bad'
export const TONE_BAR: Record<Tone, string> = { good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad', none: 'bg-slate-300' }
export const TONE_TEXT: Record<Tone, string> = { good: 'text-good', warn: 'text-warn', bad: 'text-bad', none: 'text-muted' }
export const TONE_BADGE: Record<Tone, string> = {
  good: 'bg-green-100 text-green-800',
  warn: 'bg-orange-100 text-orange-800',
  bad: 'bg-red-100 text-red-800',
  none: 'bg-slate-200 text-slate-600',
}
export const TONE_HEX: Record<Tone, string> = { good: '#15803d', warn: '#d97706', bad: '#dc2626', none: '#94a3b8' }

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('rounded-2xl border border-[#e5edf4] bg-white p-5 shadow-[0_8px_26px_#1230470b]', className)}>
      {children}
    </div>
  )
}
export const CardHead = ({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) => (
  <div className="mb-4 flex items-center justify-between gap-3">
    <div>
      <h3 className="m-0 text-base font-bold">{title}</h3>
      {sub && <small className="text-muted">{sub}</small>}
    </div>
    {action}
  </div>
)
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cx('animate-pulse rounded-lg bg-slate-200/80', className)} />
)
export const Badge = ({ tone = 'none', children }: { tone?: Tone; children: ReactNode }) => (
  <span className={cx('inline-block rounded-full px-2.5 py-1 text-[11px] font-bold', TONE_BADGE[tone])}>{children}</span>
)
export const Meter = ({ pct, tone }: { pct: number | null; tone: Tone }) => (
  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
    <div className={cx('h-full rounded-full transition-[width]', TONE_BAR[tone])} style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
  </div>
)
export const Stat = ({ label, value, sub, tone = 'none' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) => (
  <Card>
    <span className="text-xs text-muted">{label}</span>
    <b className={cx('mt-2 mb-1 block text-3xl', tone !== 'none' && TONE_TEXT[tone])}>{value}</b>
    {sub && <span className="text-xs text-muted">{sub}</span>}
  </Card>
)
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50 text-red-800">
      <p className="m-0 mb-2 font-bold">تعذّر تحميل البيانات</p>
      <p className="m-0 mb-3 text-sm" dir="ltr">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-bold text-white">
          إعادة المحاولة
        </button>
      )}
    </Card>
  )
}
export const Empty = ({ children }: { children: ReactNode }) => (
  <p className="m-0 py-8 text-center text-sm text-muted">{children}</p>
)
