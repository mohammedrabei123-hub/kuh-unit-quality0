import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Card, ErrorBox, Skeleton } from '../../components/ui'
import Modal from '../../components/Modal'
import { supabase } from '../../lib/supabase'
import { check, useAction } from '../../lib/useAction'
import type { Criterion } from '../../lib/types'
import { Field, btn, btnOut, inp } from './shared'

interface D { id: string; code: string; name_ar: string; name_en: string; is_active: boolean }

export default function AdminDepartments() {
  const [edit, setEdit] = useState<Partial<D> | null>(null)
  const [assign, setAssign] = useState<D | null>(null)
  const q = useQuery({ queryKey: ['admin-depts'], queryFn: async () => (check(await supabase.from('departments').select('*').order('code')) ?? []) as D[] })

  return (
    <Card>
      <div className="mb-4 flex justify-between">
        <h3 className="m-0 font-bold">الأقسام ({q.data?.length ?? 0})</h3>
        <button className={btn} onClick={() => setEdit({ is_active: true })}>＋ قسم جديد</button>
      </div>
      {q.error && <ErrorBox message={(q.error as Error).message} />}
      {q.isPending && <Skeleton className="h-48" />}
      <div className="overflow-auto">
        <table className="w-full min-w-[560px] text-sm">
          <tbody>
            {q.data?.map((d) => (
              <tr key={d.id} className="border-b border-slate-100">
                <td className="p-3 font-bold text-brand">{d.code}</td>
                <td className="p-3">{d.name_ar}<small className="block text-muted">{d.name_en}</small></td>
                <td className="p-3"><Badge tone={d.is_active ? 'good' : 'none'}>{d.is_active ? 'نشط' : 'معطّل'}</Badge></td>
                <td className="space-x-2 space-x-reverse whitespace-nowrap p-3 text-end">
                  <button className={btnOut} onClick={() => setAssign(d)}>المعايير</button>
                  <button className={btnOut} onClick={() => setEdit(d)}>تعديل</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && <DeptForm d={edit} onClose={() => setEdit(null)} />}
      {assign && <AssignCriteria d={assign} onClose={() => setAssign(null)} />}
    </Card>
  )
}

function DeptForm({ d, onClose }: { d: Partial<D>; onClose: () => void }) {
  const [v, setV] = useState({ code: d.code ?? '', name_ar: d.name_ar ?? '', name_en: d.name_en ?? '', is_active: d.is_active ?? true })
  const { run, busy } = useAction()
  const save = async () => {
    if (!v.code.trim() || !v.name_ar.trim()) return
    const ok = await run(async () => {
      const row = { ...v, code: v.code.trim().toUpperCase(), name_ar: v.name_ar.trim(), name_en: v.name_en.trim() }
      check(d.id ? await supabase.from('departments').update(row).eq('id', d.id) : await supabase.from('departments').insert(row))
      return true
    }, 'تم الحفظ')
    if (ok) onClose()
  }
  return (
    <Modal title={d.id ? 'تعديل القسم' : 'قسم جديد'} onClose={onClose}>
      <Field label="الكود (إنجليزي، فريد)"><input className={inp} dir="ltr" value={v.code} disabled={!!d.id} onChange={(e) => setV({ ...v, code: e.target.value })} /></Field>
      <Field label="الاسم بالعربي"><input className={inp} value={v.name_ar} onChange={(e) => setV({ ...v, name_ar: e.target.value })} /></Field>
      <Field label="الاسم بالإنجليزي"><input className={inp} dir="ltr" value={v.name_en} onChange={(e) => setV({ ...v, name_en: e.target.value })} /></Field>
      <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={v.is_active} onChange={(e) => setV({ ...v, is_active: e.target.checked })} /> قسم نشط</label>
      <button className={btn} disabled={busy} onClick={save}>حفظ</button>
    </Modal>
  )
}

function AssignCriteria({ d, onClose }: { d: D; onClose: () => void }) {
  const [term, setTerm] = useState('')
  const [sel, setSel] = useState<Set<string> | null>(null)
  const { run, busy } = useAction()
  const all = useQuery({ queryKey: ['admin-crit-active'], queryFn: async () => (check(await supabase.from('criteria').select('id,code,title_ar,category,is_active').eq('is_active', true).order('code').limit(1000)) ?? []) as Criterion[] })
  const cur = useQuery({
    queryKey: ['admin-dept-crit', d.id], staleTime: 0,
    queryFn: async () => new Set(((check(await supabase.from('department_criteria').select('criterion_id').eq('department_id', d.id)) ?? []) as { criterion_id: string }[]).map((x) => x.criterion_id)),
  })
  const chosen = sel ?? cur.data ?? new Set<string>()
  const list = useMemo(() => (all.data ?? []).filter((c) => !term || `${c.code} ${c.title_ar} ${c.category}`.toLowerCase().includes(term.toLowerCase())), [all.data, term])
  const toggle = (id: string) => { const n = new Set(chosen); n.has(id) ? n.delete(id) : n.add(id); setSel(n) }
  const save = async () => {
    const ids = (all.data ?? []).filter((c) => chosen.has(c.id)).map((c) => c.id)
    const ok = await run(async () => check(await supabase.rpc('set_department_criteria', { p_department_id: d.id, p_criterion_ids: ids, p_replace: true })), 'تم حفظ معايير القسم')
    if (ok !== undefined) onClose()
  }
  return (
    <Modal wide title={`معايير: ${d.name_ar}`} onClose={onClose}>
      <div className="mb-3 flex gap-2">
        <input className={inp} placeholder="بحث بالكود أو النص أو المجال…" value={term} onChange={(e) => setTerm(e.target.value)} />
        <button className={btnOut} onClick={() => setSel(new Set([...chosen, ...list.map((c) => c.id)]))}>تحديد الظاهر</button>
        <button className={btnOut} onClick={() => { const n = new Set(chosen); list.forEach((c) => n.delete(c.id)); setSel(n) }}>إلغاء الظاهر</button>
      </div>
      {(all.isPending || cur.isPending) ? <Skeleton className="h-64" /> : (
        <div className="max-h-[50vh] overflow-auto rounded-xl border border-line">
          {list.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-start gap-3 border-b border-slate-100 p-3 text-sm hover:bg-slate-50">
              <input type="checkbox" className="mt-1" checked={chosen.has(c.id)} onChange={() => toggle(c.id)} />
              <span><b className="text-brand">{c.code}</b> — {c.title_ar}<small className="block text-muted">{c.category}</small></span>
            </label>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-muted">المحدد: {chosen.size}</span>
        <button className={btn} disabled={busy || cur.isPending} onClick={save}>حفظ</button>
      </div>
    </Modal>
  )
}
