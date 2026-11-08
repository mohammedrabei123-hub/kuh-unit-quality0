import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { Badge, Card, Empty, ErrorBox, Skeleton, TONE_TEXT, toneOf } from '../components/ui'
import { CAN_CREATE_ASSESSMENT, STATUS_LABELS } from '../lib/constants'
import { fmtDate, fmtPct } from '../lib/format'
import { normScore, useDepartments, useRoundsCount } from '../lib/queries'
import { supabase } from '../lib/supabase'
import { check, useAction } from '../lib/useAction'
import type { AssessmentStatus } from '../lib/types'

const PAGE = 20

export default function Assessments() {
  const { profile } = useAuth()
  const [page, setPage] = useState(0)
  const [f, setF] = useState({ dept: '', status: '', round: '', year: '' })
  const depts = useDepartments()
  const rounds = useRoundsCount()
  const { run, busy } = useAction()
  const isAdmin = profile!.role === 'super_admin' || profile!.role === 'quality_admin'
  const canCreate = CAN_CREATE_ASSESSMENT.includes(profile!.role)
  const set = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v })); setPage(0) }

  const q = useQuery({
    queryKey: ['assessments-log', page, f],
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      let qb = supabase.from('v_assessment_scores')
        .select('id,assessment_date,department_id,evaluator_id,status,round,score_obtained,score_max,items_scored,items_na,items_total,pct', { count: 'exact' })
        .order('assessment_date', { ascending: false }).order('created_at', { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1)
      if (f.dept) qb = qb.eq('department_id', f.dept)
      if (f.status) qb = qb.eq('status', f.status)
      if (f.round) qb = qb.eq('round', Number(f.round))
      if (f.year) qb = qb.gte('assessment_date', `${f.year}-01-01`).lte('assessment_date', `${f.year}-12-31`)
      const { data, error, count } = await qb
      if (error) throw new Error(error.message)
      const rows = (data ?? []).map(normScore)
      const ids = [...new Set(rows.map((r) => r.evaluator_id).filter(Boolean))] as string[]
      const names = new Map<string, string>()
      if (ids.length) {
        const p = await supabase.from('profiles').select('id,full_name').in('id', ids)
        for (const x of p.data ?? []) names.set(x.id, x.full_name)
      }
      return { rows, count: count ?? 0, names }
    },
  })
  const deptName = new Map(depts.data?.map((d) => [d.id, d.name_ar]))
  const pages = Math.max(1, Math.ceil((q.data?.count ?? 0) / PAGE))
  const years = [0, 1, 2, 3].map((i) => new Date().getFullYear() - i)
  const sel = 'rounded-xl border border-line bg-white px-3 py-2 text-sm'

  const setStatus = (id: string, status: AssessmentStatus) =>
    run(async () => check(await supabase.from('assessments').update({ status }).eq('id', id)), 'تم تحديث الحالة')
  const del = (id: string) => {
    if (!confirm('حذف التقييم وكل بنوده نهائيًا؟')) return
    run(async () => check(await supabase.from('assessments').delete().eq('id', id)), 'تم الحذف')
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select className={sel} value={f.dept} onChange={(e) => set('dept', e.target.value)} aria-label="القسم">
            <option value="">كل الأقسام</option>
            {depts.data?.map((d) => <option key={d.id} value={d.id}>{d.name_ar}</option>)}
          </select>
          <select className={sel} value={f.round} onChange={(e) => set('round', e.target.value)} aria-label="الجولة">
            <option value="">كل الجولات</option>
            {Array.from({ length: rounds.data ?? 4 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>الجولة {n}</option>)}
          </select>
          <select className={sel} value={f.year} onChange={(e) => set('year', e.target.value)} aria-label="السنة">
            <option value="">كل السنوات</option>
            {years.map((y) => <option key={y}>{y}</option>)}
          </select>
          <select className={sel} value={f.status} onChange={(e) => set('status', e.target.value)} aria-label="الحالة">
            <option value="">كل الحالات</option>
            {(Object.keys(STATUS_LABELS) as AssessmentStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        {canCreate && <Link to="/assessments/new" className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white">＋ تقييم جديد</Link>}
      </div>

      {q.error && <ErrorBox message={(q.error as Error).message} onRetry={() => q.refetch()} />}
      {q.isPending && <Skeleton className="h-64" />}
      {q.data && (q.data.rows.length ? (
        <div className="overflow-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                {['القسم', 'الجولة', 'التاريخ', 'المقيّم', 'البنود', 'النتيجة', 'الحالة', ''].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {q.data.rows.map((r) => {
                const mine = r.evaluator_id === profile!.id
                return (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="p-3">{deptName.get(r.department_id) ?? '—'}</td>
                    <td className="p-3">{r.round}</td>
                    <td className="p-3">{fmtDate(r.assessment_date)}</td>
                    <td className="p-3">{(r.evaluator_id && q.data.names.get(r.evaluator_id)) || '—'}</td>
                    <td className="p-3">{r.items_scored}/{r.items_total}</td>
                    <td className="p-3"><b className={TONE_TEXT[toneOf(r.pct)]}>{fmtPct(r.pct)}</b></td>
                    <td className="p-3">
                      {isAdmin ? (
                        <select disabled={busy} value={r.status} onChange={(e) => setStatus(r.id, e.target.value as AssessmentStatus)} className="rounded-lg border border-line bg-white p-1.5 text-xs">
                          {(Object.keys(STATUS_LABELS) as AssessmentStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                      ) : <Badge tone={r.status === 'draft' ? 'warn' : 'good'}>{STATUS_LABELS[r.status]}</Badge>}
                    </td>
                    <td className="space-x-2 space-x-reverse whitespace-nowrap p-3">
                      <Link to={`/assessments/${r.id}`} className="font-bold text-brand">فتح</Link>
                      {(isAdmin || (mine && r.status === 'draft')) && <button disabled={busy} onClick={() => del(r.id)} className="font-bold text-bad">حذف</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : <Empty>لا توجد تقييمات مطابقة</Empty>)}

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted">{q.data?.count ?? 0} تقييم</span>
        <div className="flex items-center gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">السابق</button>
          <span>{page + 1} / {pages}</span>
          <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">التالي</button>
        </div>
      </div>
    </Card>
  )
}
