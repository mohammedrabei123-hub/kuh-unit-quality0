import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthProvider'
import { Badge, Card, ErrorBox, Skeleton } from '../../components/ui'
import Modal from '../../components/Modal'
import { ROLE_LABELS } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import { check, useAction } from '../../lib/useAction'
import type { Dept, Profile, Role } from '../../lib/types'
import { Field, btn, btnOut, inp } from './shared'

const ROLES = Object.keys(ROLE_LABELS) as Role[]

export default function AdminUsers() {
  const [edit, setEdit] = useState<Profile | 'new' | null>(null)
  const q = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const [p, ud, d] = await Promise.all([
        supabase.from('profiles').select('id,full_name,email,role,is_active').order('created_at', { ascending: false }),
        supabase.from('user_departments').select('user_id,department_id'),
        supabase.from('departments').select('id,code,name_ar,name_en').eq('is_active', true).order('name_ar'),
      ])
      const map = new Map<string, string[]>()
      for (const x of (check(ud) ?? []) as { user_id: string; department_id: string }[]) map.set(x.user_id, [...(map.get(x.user_id) ?? []), x.department_id])
      return { users: (check(p) ?? []) as Profile[], map, depts: (check(d) ?? []) as Dept[] }
    },
  })
  return (
    <Card>
      <div className="mb-4 flex justify-between">
        <h3 className="m-0 font-bold">المستخدمون ({q.data?.users.length ?? 0})</h3>
        <button className={btn} onClick={() => setEdit('new')}>＋ مستخدم جديد</button>
      </div>
      {q.error && <ErrorBox message={(q.error as Error).message} />}
      {q.isPending && <Skeleton className="h-48" />}
      <div className="overflow-auto">
        <table className="w-full min-w-[640px] text-sm">
          <tbody>
            {q.data?.users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="p-3">{u.full_name || '—'}<small className="block text-muted" dir="ltr">{u.email}</small></td>
                <td className="p-3">{ROLE_LABELS[u.role]}</td>
                <td className="p-3 text-muted">{q.data.map.get(u.id)?.length ?? 0} قسم</td>
                <td className="p-3"><Badge tone={u.is_active ? 'good' : 'bad'}>{u.is_active ? 'مفعّل' : 'موقوف'}</Badge></td>
                <td className="p-3 text-end"><button className={btnOut} onClick={() => setEdit(u)}>تعديل</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && q.data && <UserForm u={edit === 'new' ? null : edit} depts={q.data.depts} mine={edit === 'new' ? [] : q.data.map.get(edit.id) ?? []} onClose={() => setEdit(null)} />}
    </Card>
  )
}

function UserForm({ u, depts, mine, onClose }: { u: Profile | null; depts: Dept[]; mine: string[]; onClose: () => void }) {
  const { profile } = useAuth()
  const self = u?.id === profile!.id
  const [v, setV] = useState({ email: u?.email ?? '', password: '', full_name: u?.full_name ?? '', role: (u?.role ?? 'viewer') as Role, is_active: u?.is_active ?? true })
  const [sel, setSel] = useState(new Set(mine))
  const { run, busy } = useAction()
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const save = async () => {
    const ids = [...sel]
    const ok = await run(async () => {
      if (!u) {
        if (!v.email.trim() || v.password.length < 8) throw new Error('الإيميل مطلوب وكلمة المرور 8 حروف على الأقل')
        check(await supabase.rpc('create_user', { p_email: v.email, p_password: v.password, p_full_name: v.full_name, p_role: v.role, p_department_ids: ids }))
      } else {
        check(await supabase.from('profiles').update({ full_name: v.full_name, ...(self ? {} : { is_active: v.is_active }) }).eq('id', u.id))
        if (!self && v.role !== u.role) check(await supabase.rpc('set_user_role', { p_user_id: u.id, p_role: v.role }))
        check(await supabase.rpc('set_user_departments', { p_user_id: u.id, p_department_ids: ids }))
      }
      return true
    }, 'تم الحفظ')
    if (ok) onClose()
  }
  return (
    <Modal wide title={u ? 'تعديل مستخدم' : 'مستخدم جديد'} onClose={onClose}>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <Field label="الاسم"><input className={inp} value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} /></Field>
        <Field label="الدور">
          <select className={inp} value={v.role} disabled={self} onChange={(e) => setV({ ...v, role: e.target.value as Role })}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </Field>
        <Field label="الإيميل"><input className={inp} dir="ltr" type="email" value={v.email} disabled={!!u} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
        {!u && <Field label="كلمة المرور (8+ حروف)"><input className={inp} dir="ltr" type="text" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} /></Field>}
      </div>
      {u && <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" disabled={self} checked={v.is_active} onChange={(e) => setV({ ...v, is_active: e.target.checked })} /> الحساب مفعّل</label>}
      <p className="mb-2 text-xs text-muted">الأقسام المسموح بها (المشرفون والمشاهد بيشوفوا كل الأقسام تلقائيًا)</p>
      <div className="mb-4 grid max-h-48 gap-1 overflow-auto rounded-xl border border-line p-3 sm:grid-cols-2">
        {depts.map((d) => (
          <label key={d.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sel.has(d.id)} onChange={() => toggle(d.id)} /> {d.name_ar}</label>
        ))}
      </div>
      <button className={btn} disabled={busy} onClick={save}>حفظ</button>
    </Modal>
  )
}
