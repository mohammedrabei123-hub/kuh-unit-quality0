import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Card, Empty, ErrorBox, Meter, Skeleton, TONE_TEXT, toneOf } from '../components/ui'
import { deptIcon } from '../lib/constants'
import { fmtDate, fmtPct } from '../lib/format'
import { pickByRound, useDepartments, useRoundsCount, useYearScores, yearOptions } from '../lib/queries'
import { useDebounce } from '../lib/useDebounce'

export default function Departments() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const term = useDebounce(search.trim().toLowerCase())
  const depts = useDepartments()
  const rounds = useRoundsCount()
  const scores = useYearScores(year)

  const cards = useMemo(() => {
    if (!depts.data || !scores.data) return []
    const byRound = pickByRound(scores.data)
    return depts.data.map((dept) => {
      const rs = [...byRound.values()].filter((r) => r.department_id === dept.id && r.status !== 'draft' && r.pct != null)
      const avg = rs.length ? rs.reduce((a, r) => a + (r.pct ?? 0), 0) / rs.length : null
      const last = rs.map((r) => r.assessment_date).sort().pop() ?? null
      return { dept, done: rs.length, avg, last }
    })
  }, [depts.data, scores.data])

  const shown = cards.filter(
    (c) =>
      (!term || `${c.dept.name_ar} ${c.dept.name_en} ${c.dept.code}`.toLowerCase().includes(term)) &&
      (!status || (status === 'done' ? c.done > 0 : c.done === 0)),
  )
  const err = depts.error ?? scores.error ?? rounds.error

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم القسم..." className="min-w-60 flex-1 rounded-xl border border-line px-3 py-2" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2">
            <option value="">كل الحالات</option>
            <option value="done">تم تقييمه</option>
            <option value="new">لم يتم تقييمه</option>
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-xl border border-line bg-white px-3 py-2" aria-label="السنة">
            {yearOptions().map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
      </Card>
      {err && <ErrorBox message={(err as Error).message} />}
      {(depts.isPending || scores.isPending) && !err && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-40" />)}</div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => {
          const tone = toneOf(c.avg)
          return (
            <Link key={c.dept.id} to={`/departments/${c.dept.id}?year=${year}`} className="rounded-2xl border border-[#e4ebf2] bg-white p-4 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div className="grid size-11 place-items-center rounded-xl bg-sky-50 text-xl">{deptIcon(c.dept.code)}</div>
                <Badge tone={c.done ? 'good' : 'none'}>{c.done ? `${c.done} / ${rounds.data ?? 4}` : 'لم يبدأ'}</Badge>
              </div>
              <h4 className="mt-3 mb-1 font-bold">{c.dept.name_ar}</h4>
              <small className="text-muted">{c.dept.name_en || c.dept.code}</small>
              <div className="my-3"><Meter pct={c.avg} tone={tone} /></div>
              <div className="flex justify-between text-xs">
                <span className={TONE_TEXT[tone]}>{c.avg != null ? `متوسط ${fmtPct(c.avg)}` : 'لا توجد نتائج'}</span>
                <span className="text-muted">{c.last ? `آخر: ${fmtDate(c.last)}` : ''}</span>
              </div>
            </Link>
          )
        })}
      </div>
      {depts.data && scores.data && !shown.length && <Empty>لا توجد أقسام مطابقة</Empty>}
    </div>
  )
}
