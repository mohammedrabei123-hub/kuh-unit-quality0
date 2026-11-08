import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import AdminAudit from './admin/AdminAudit'
import AdminCriteria from './admin/AdminCriteria'
import AdminDepartments from './admin/AdminDepartments'
import AdminSettings from './admin/AdminSettings'
import AdminUsers from './admin/AdminUsers'
import Placeholder from './Placeholder'

const TABS = [
  { id: 'depts', label: 'الأقسام', el: <AdminDepartments /> },
  { id: 'criteria', label: 'المعايير', el: <AdminCriteria /> },
  { id: 'users', label: 'المستخدمون', el: <AdminUsers />, superOnly: true },
  { id: 'settings', label: 'الإعدادات', el: <AdminSettings /> },
  { id: 'audit', label: 'سجل التدقيق', el: <AdminAudit /> },
]

export default function Admin() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('depts')
  const role = profile!.role
  if (role !== 'super_admin' && role !== 'quality_admin') return <Placeholder name="غير مصرح لك بدخول شاشة الإدارة" />
  const tabs = TABS.filter((t) => !t.superOnly || role === 'super_admin')
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === t.id ? 'bg-brand text-white' : 'bg-white text-brand border border-[#b6d5e6]'}`}>{t.label}</button>
        ))}
      </div>
      {tabs.find((t) => t.id === tab)?.el}
    </div>
  )
}
