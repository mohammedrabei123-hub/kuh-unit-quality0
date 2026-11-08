const dateFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' })
const monthFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'short', year: '2-digit' })

export const fmtPct = (n: number | null | undefined) =>
  n == null ? '--' : `${Math.round(n * 10) / 10}%`
export const fmtDate = (s: string) => dateFmt.format(new Date(s + 'T00:00:00'))
export const fmtMonth = (ym: string) => monthFmt.format(new Date(ym + '-01T00:00:00'))

export const monthKey = (s: string) => s.slice(0, 7)
// أول يوم في الشهر قبل n-1 شهر (فترة "آخر n شهور" بتشمل الشهر الحالي)
export function periodStart(months: number): string | null {
  if (!months) return null
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - (months - 1))
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${m}-01`
}
