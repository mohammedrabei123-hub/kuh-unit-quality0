export type Role = 'super_admin' | 'quality_admin' | 'auditor' | 'department_user' | 'viewer'
export type AssessmentStatus = 'draft' | 'approved' | 'closed'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: Role
  is_active: boolean
}
export interface Dept { id: string; code: string; name_ar: string; name_en: string }
export interface ScoreRow {
  id: string
  assessment_date: string
  department_id: string
  evaluator_id?: string
  round: number
  status: AssessmentStatus
  score_obtained: number
  score_max: number
  items_scored: number
  items_na: number
  items_total: number
  pct: number | null
}
export interface CatRow {
  assessment_id: string
  department_id: string
  assessment_date: string
  status: AssessmentStatus
  category: string
  score_obtained: number
  score_max: number
}

export interface Criterion {
  id: string
  code: string
  title_ar: string
  category: string
  verification_method: string
  max_score: number
  allow_na: boolean
  is_active: boolean
}
export type ResultValue = '' | '2' | '1' | '0' | 'na'
