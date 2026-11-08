import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from '../auth/AuthProvider'
import { ALL_DEPT_ROLES } from './constants'
import type { Dept, ScoreRow } from './types'

// الأقسام النشطة المتاحة لليوزر (نفس منطق can_access_department)
export function useDepartments() {
  const { profile } = useAuth()
  const role = profile!.role, uid = profile!.id
  return useQuery({
    queryKey: ['departments', role, uid],
    staleTime: 300_000,
    queryFn: async (): Promise<Dept[]> => {
      const restricted = !ALL_DEPT_ROLES.includes(role)
      const [d, u] = await Promise.all([
        supabase.from('departments').select('id,code,name_ar,name_en').eq('is_active', true).order('name_ar'),
        restricted ? supabase.from('user_departments').select('department_id').eq('user_id', uid) : Promise.resolve(null),
      ])
      if (d.error) throw new Error(d.error.message)
      if (u?.error) throw new Error(u.error.message)
      const all = (d.data ?? []) as Dept[]
      if (!u?.data) return all
      const mine = new Set(u.data.map((x: { department_id: string }) => x.department_id))
      return all.filter((x) => mine.has(x.id))
    },
  })
}

export function useRoundsCount() {
  return useQuery({
    queryKey: ['settings', 'rounds_count'],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'rounds_count').maybeSingle()
      if (error) throw new Error(error.message)
      const n = Number(data?.value)
      return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 4
    },
  })
}

const SCORE_COLS = 'id,assessment_date,department_id,evaluator_id,status,round,score_obtained,score_max,items_scored,items_na,items_total,pct'
export const normScore = (r: Record<string, unknown>) =>
  ({ ...r, score_obtained: Number(r.score_obtained ?? 0), score_max: Number(r.score_max ?? 0), pct: r.pct == null ? null : Number(r.pct) }) as unknown as ScoreRow

// كل تقييمات سنة معينة (التقييم بيتنسب لسنة تاريخه)
export function useYearScores(year: number) {
  return useQuery({
    queryKey: ['scores', year],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<ScoreRow[]> => {
      const { data, error } = await supabase
        .from('v_assessment_scores')
        .select(SCORE_COLS)
        .gte('assessment_date', `${year}-01-01`)
        .lte('assessment_date', `${year}-12-31`)
        .order('assessment_date', { ascending: false })
        .limit(1000)
      if (error) throw new Error(error.message)
      return (data ?? []).map(normScore)
    },
  })
}

export const yearOptions = () => {
  const y = new Date().getFullYear()
  return [y + 1, y, y - 1, y - 2]
}
// آخر تقييم غير مسودة لكل (قسم، جولة) — أو أي تقييم لو مسودة فقط
export function pickByRound(rows: ScoreRow[]) {
  const rank = (r: ScoreRow) => (r.status === 'draft' ? 0 : 1)
  const m = new Map<string, ScoreRow>()
  for (const r of rows) {
    const k = `${r.department_id}|${r.round}`
    const cur = m.get(k)
    if (!cur || rank(r) > rank(cur) || (rank(r) === rank(cur) && r.assessment_date > cur.assessment_date)) m.set(k, r)
  }
  return m
}
export const roundsList = (n: number, rows: ScoreRow[]) =>
  Array.from({ length: Math.max(n, ...rows.map((r) => r.round), 1) }, (_, i) => i + 1)
