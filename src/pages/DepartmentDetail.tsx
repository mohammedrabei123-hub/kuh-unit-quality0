import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Badge, Card, CardHead, ErrorBox, Skeleton, Stat, TONE_TEXT, toneOf } from '../components/ui'
import { CAN_CREATE_ASSESSMENT, STATUS_LABELS, deptIcon } from '../lib/constants'
import { fmtDate, fmtPct } from '../lib/format'
import { pickByRound, roundsList, useDepartments, useRoundsCount, useYearScores, yearOptions } from '../lib/queries'
import Placeholder from './Placeholder'

export default function DepartmentDetail() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const { profile } = useAuth()
  const [year, setYear] = useState(Number(sp.get('year')) || new Date().getFullYear())
  const depts = useDepartments()
  const roundsCount = useRoundsCount()
  const scores = useYearScores(year)
  const canCreate = CAN_CREATE_ASSESSMENT.includes(profile!.role)

  const dept = depts.data?.find((d) => d.id === id)
  const model = useMemo(() => {
    if (!scores.data || !dept) return null
    const mine = scores.data.filter((s) => s.department_id === dept.id)
    const byRound = pickByRound(mine)
    const rounds = roundsList(roundsCount.data ?? 4, mine)
    const done = rounds.map((r) => byRound.get(`${dept.id}|${r}`)).filter((r) => r && r.status !== 'draft' && r.pct != null)
    const avg = done.length ? done.reduce((a, r) => a + (r?.pct ?? 0), 0) / done.length : null
    const last = done.map((r) => r!.assessment_date).sort().pop() ?? null
    return { rounds, byRound, done: done.length, avg, last }
  }, [scores.data, dept, roundsCount.data])

  if (depts.isPending) return <Skeleton className="h-64" />
  if (depts.error) return <ErrorBox message={(depts.error as Error).message} />
  if (!dept) return <Placeholder name="القسم غير موجود أو غير مصرح لك بالوصول إليه" />

  return (
    <div className="space-y-4">
      <Link to="/departments" className="font-bold text-brand">← العودة إلى الأقسام</Link>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-linear-to-l from-brand to-brand-2 p-6 text-white">
        <div>
          <h3 className="m-0 mb-1 text-2xl font-bold">{deptIcon(dept.code)} {dept.name_ar}</h3>
          <p className="m-0 text-sky-100">{dept.name_en || dept.code}</p>
        </div>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-xl bg-white px-3 py-2 text-ink" aria-label="السنة">
          {yearOptions().map((y) => <option key={y}>{y}</option>)}
        </select>
      </div>

      {scores.isPending || !model ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="عدد الجولات" value={model.rounds.length} />
            <Stat label="الجولات المكتملة" value={`${model.done} / ${model.rounds.length}`} />
            <Stat label="متوسط القسم" value={fmtPct(model.avg)} tone={toneOf(model.avg)} />
            <Stat label="آخر تقييم" value={<span className="text-lg">{model.last ? fmtDate(model.last) : 'لم يتم'}</span>} />
          </div>
          <Card>
            <CardHead title={`جولات القسم — ${year}`} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {model.rounds.map((n) => {
                const r = model.byRound.get(`${dept.id}|${n}`)
                const draft = r?.status === 'draft'
                return (
                  <div key={n} className="rounded-xl border border-line bg-[#fafcfe] p-4">
                    <b className="mb-2 block">الجولة {n}</b>
                    <Badge tone={!r ? 'none' : draft ? 'warn' : 'good'}>{r ? STATUS_LABELS[r.status] : 'لم تبدأ'}</Badge>
                    <p className={`my-3 text-sm ${r && !draft ? TONE_TEXT[toneOf(r.pct)] : 'text-muted'}`}>
                      {r ? (draft ? 'مسودة — لم تُعتمد بعد' : `النتيجة: ${fmtPct(r.pct)}`) : 'جاهزة للتقييم'}
                    </p>
                    {r ? (
                      <Link to={`/assessments/${r.id}`} className="inline-block rounded-lg border border-[#b6d5e6] px-3 py-2 text-xs font-bold text-brand">
                        {draft && canCreate ? 'استكمال' : 'عرض'}
                      </Link>
                    ) : canCreate ? (
                      <Link to={`/assessments/new?dept=${dept.id}&round=${n}&year=${year}`} className="inline-block rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white">
                        بدء الجولة
                      </Link>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
