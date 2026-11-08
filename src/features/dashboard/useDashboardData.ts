import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { ALL_DEPT_ROLES } from '../../lib/constants'
import { periodStart, monthKey } from '../../lib/format'
import type { CatRow, Dept, Role, ScoreRow } from '../../lib/types'

export interface RawDashboard { depts: Dept[]; scores: ScoreRow[]; cats: CatRow[] }

const num = (v: unknown) => Number(v ?? 0)

// 4 طلبات بالتوازي بدل N+1 — التجميع كله جوه الـ views في الـ DB
export function useDashboardData(months: number, role: Role, userId: string) {
  return useQuery({
    queryKey: ['dashboard', months, role, userId],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<RawDashboard> => {
      const from = periodStart(months)

      let sq = supabase
        .from('v_assessment_scores')
        .select('id,assessment_date,department_id,status,round,score_obtained,score_max,items_scored,items_na,items_total,pct')
        .order('assessment_date', { ascending: false })
        .limit(1000)
      let cq = supabase
        .from('v_category_scores')
        .select('assessment_id,department_id,assessment_date,status,category,score_obtained,score_max')
        .limit(1000)
      if (from) {
        sq = sq.gte('assessment_date', from)
        cq = cq.gte('assessment_date', from)
      }
      const dq = supabase.from('departments').select('id,code,name_ar,name_en').eq('is_active', true).order('name_ar')
      const restricted = !ALL_DEPT_ROLES.includes(role)
      const uq = restricted ? supabase.from('user_departments').select('department_id').eq('user_id', userId) : null

      const [d, s, c, u] = await Promise.all([dq, sq, cq, uq ?? Promise.resolve(null)])
      for (const r of [d, s, c, u]) if (r && r.error) throw new Error(r.error.message)

      let depts = (d.data ?? []) as Dept[]
      if (u?.data) {
        const mine = new Set(u.data.map((x: { department_id: string }) => x.department_id))
        depts = depts.filter((x) => mine.has(x.id))
      }
      const scores = (s.data ?? []).map((r) => ({
        ...r,
        score_obtained: num(r.score_obtained),
        score_max: num(r.score_max),
        pct: r.pct == null ? null : Number(r.pct),
      })) as ScoreRow[]
      const cats = (c.data ?? []).map((r) => ({
        ...r,
        score_obtained: num(r.score_obtained),
        score_max: num(r.score_max),
      })) as CatRow[]
      return { depts, scores, cats }
    },
  })
}

export interface DeptStat { dept: Dept; count: number; avg: number | null; latest: number | null; latestDate: string | null }

export function buildDashboard({ depts, scores, cats }: RawDashboard) {
  const allowed = new Set(depts.map((d) => d.id))
  const mine = scores.filter((s) => allowed.has(s.department_id))
  const done = mine.filter((s) => s.status !== 'draft' && s.pct != null)
  const drafts = mine.filter((s) => s.status === 'draft').length
  const avg = done.length ? done.reduce((a, s) => a + (s.pct ?? 0), 0) / done.length : null

  // الاتجاه الشهري
  const byMonth = new Map<string, { sum: number; n: number }>()
  for (const s of done) {
    const k = monthKey(s.assessment_date)
    const m = byMonth.get(k) ?? { sum: 0, n: 0 }
    m.sum += s.pct ?? 0
    m.n += 1
    byMonth.set(k, m)
  }
  const monthly = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, m]) => ({ month, avg: Math.round((m.sum / m.n) * 10) / 10, count: m.n }))
  const delta = monthly.length >= 2 ? monthly[monthly.length - 1].avg - monthly[monthly.length - 2].avg : null

  // إحصائيات الأقسام
  const stats: DeptStat[] = depts.map((dept) => {
    const rows = done.filter((s) => s.department_id === dept.id).sort((a, b) => b.assessment_date.localeCompare(a.assessment_date))
    return {
      dept,
      count: rows.length,
      avg: rows.length ? rows.reduce((a, s) => a + (s.pct ?? 0), 0) / rows.length : null,
      latest: rows[0]?.pct ?? null,
      latestDate: rows[0]?.assessment_date ?? null,
    }
  })

  // المجالات (الأضعف أولًا)
  const catMap = new Map<string, { o: number; m: number }>()
  for (const c of cats) {
    if (c.status === 'draft' || !allowed.has(c.department_id)) continue
    const x = catMap.get(c.category) ?? { o: 0, m: 0 }
    x.o += c.score_obtained
    x.m += c.score_max
    catMap.set(c.category, x)
  }
  const categories = [...catMap.entries()]
    .filter(([, x]) => x.m > 0)
    .map(([name, x]) => ({ name, pct: Math.round((x.o / x.m) * 1000) / 10 }))
    .sort((a, b) => a.pct - b.pct)

  const deptName = new Map(depts.map((d) => [d.id, d.name_ar]))
  const recent = [...mine]
    .sort((a, b) => b.assessment_date.localeCompare(a.assessment_date))
    .slice(0, 8)
    .map((s) => ({ ...s, deptName: deptName.get(s.department_id) ?? '—' }))

  return { done: done.length, drafts, avg, monthly, delta, stats, categories, recent }
}
export type DashboardModel = ReturnType<typeof buildDashboard>
