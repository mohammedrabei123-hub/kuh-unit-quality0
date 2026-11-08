import type { AssessmentStatus, Role } from './types'

// حدود الألوان (قابلة للتعديل)
export const THRESHOLDS = { good: 85, warn: 70 }

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'مدير النظام',
  quality_admin: 'مسؤول الجودة',
  auditor: 'مقيّم',
  department_user: 'مستخدم قسم',
  viewer: 'مشاهد',
}
export const STATUS_LABELS: Record<AssessmentStatus, string> = {
  draft: 'مسودة',
  approved: 'معتمد',
  closed: 'مغلق',
}
export const CAN_CREATE_ASSESSMENT: Role[] = ['super_admin', 'quality_admin', 'auditor']
// الأدوار اللي بتشوف كل الأقسام (مطابق لـ can_access_department في الـ DB)
export const ALL_DEPT_ROLES: Role[] = ['super_admin', 'quality_admin', 'viewer']

export const PERIODS = [
  { value: 3, label: 'آخر 3 شهور' },
  { value: 6, label: 'آخر 6 شهور' },
  { value: 12, label: 'آخر 12 شهر' },
  { value: 0, label: 'كل الفترات' },
]

const ICONS: Record<string, string> = {
  ICU: '➕', SICU: '🫀', CCU: '❤️', PICU: '🧸', NICU: '🍼', ONC: '🎗️', SURG: '🩹',
  URO: '🧪', DIAL: '💧', ENDO: '🔬', OR1: '🏥', OR2: '🏥', OR3: '🏥', CATH: '🩺', IR: '☢️',
}
export const deptIcon = (code: string) => ICONS[code.toUpperCase()] ?? '🏥'
