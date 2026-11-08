import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Card, ErrorBox, Skeleton } from '../../components/ui'
import Modal from '../../components/Modal'
import { supabase } from '../../lib/supabase'
import { check, useAction } from '../../lib/useAction'
import { useDebounce } from '../../lib/useDebounce'
import type { Criterion } from '../../lib/types'
import { Field, btn, btnOut, inp } from './shared'

const PAGE = 25

export default function AdminCriteria() {
  const [edit, setEdit] = useState<Partial<Criterion> | null>(null)
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(0)
  const t = useDebounce(term.trim().toLowerCase())
  const { run, busy } = useAction()
  const q = useQuery({ queryKey: ['admin-criteria'], queryFn: async () => (check(await supabase.from('criteria').select('*').order('code').limit(1000)) ?? []) as Criterion[] })
  const all = (q.data ?? []).filter((c) => !t || `${c.code} ${c.title_ar} ${c.category}`.toLowerCase().includes(t))
  const rows = all.slice(page * PAGE, page * PAGE + PAGE)
  const pages = Math.max(1, Math.ceil(all.length / PAGE))
  const del = (c: Criterion) => {
    if (!confirm(`حذف المعيار ${c.code}؟ هيتشال من كل الأقسام (التقييمات القديمة بتحتفظ بنسخة منه).`)) return
    run(async () => check(await supabase.from('criteria').delete().eq('id', c.id)), 'تم الحذف')
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input className={`${inp} max-w-xs`} placeholder="بحث…" value={term} onChange={(e) => { setTerm(e.target.value); setPage(0) }} />
        <button className={btn} onClick={() => setEdit({ max_score: 2, allow_na: true, is_active: true })}>＋ معيار جديد</button>
      </div>
      {q.error && <ErrorBox message={(q.error as Error).message} />}
      {q.isPending && <Skeleton className="h-48" />}
      <div className="overflow-auto">
        <table className="w-full min-w-[720px] text-sm">
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 align-top">
                <td className="p-3 font-bold text-brand whitespace-nowrap">{c.code}</td>
                <td className="p-3">{c.title_ar}<small className="block text-muted">{c.category}{c.verification_method ? ` · ${c.verification_method}` : ''}</small></td>
                <td className="p-3">{c.max_score}</td>
                <td className="p-3"><Badge tone={c.is_active ? 'good' : 'none'}>{c.is_active ? 'نشط' : 'معطّل'}</Badge></td>
                <td className="space-x-2 space-x-reverse whitespace-nowrap p-3 text-end">
                  <button className={btnOut} onClick={() => setEdit(c)}>تعديل</button>
                  <button className="text-sm font-bold text-bad" disabled={busy} onClick={() => del(c)}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted">{all.length} معيار</span>
        <div className="flex items-center gap-2">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">السابق</button>
          <span>{page + 1} / {pages}</span>
          <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">التالي</button>
        </div>
      </div>
      {edit && <CritForm c={edit} onClose={() => setEdit(null)} />}
    </Card>
  )
}

function CritForm({ c, onClose }: { c: Partial<Criterion>; onClose: () => void }) {
  const [v, setV] = useState({ code: c.code ?? '', title_ar: c.title_ar ?? '', category: c.category ?? '', verification_method: c.verification_method ?? '', max_score: c.max_score ?? 2, allow_na: c.allow_na ?? true, is_active: c.is_active ?? true })
  const { run, busy } = useAction()
  const save = async () => {
    if (!v.code.trim() || !v.title_ar.trim() || !(Number(v.max_score) > 0)) return
    const ok = await run(async () => {
      const row = { ...v, code: v.code.trim(), title_ar: v.title_ar.trim(), max_score: Number(v.max_score) }
      check(c.id ? await supabase.from('criteria').update(row).eq('id', c.id) : await supabase.from('criteria').insert(row))
      return true
    }, 'تم الحفظ')
    if (ok) onClose()
  }
  return (
    <Modal wide title={c.id ? 'تعديل المعيار' : 'معيار جديد'} onClose={onClose}>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <Field label="الكود (فريد)"><input className={inp} dir="ltr" value={v.code} onChange={(e) => setV({ ...v, code: e.target.value })} /></Field>
        <Field label="أقصى درجة"><input className={inp} type="number" min={1} step="0.5" value={v.max_score} onChange={(e) => setV({ ...v, max_score: Number(e.target.value) })} /></Field>
        <Field label="المجال"><input className={inp} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} /></Field>
        <Field label="طريقة التحقق"><input className={inp} value={v.verification_method} onChange={(e) => setV({ ...v, verification_method: e.target.value })} /></Field>
      </div>
      <Field label="نص المعيار"><textarea className={inp} rows={3} value={v.title_ar} onChange={(e) => setV({ ...v, title_ar: e.target.value })} /></Field>
      <div className="mb-4 flex gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={v.allow_na} onChange={(e) => setV({ ...v, allow_na: e.target.checked })} /> يسمح بـ N/A</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={v.is_active} onChange={(e) => setV({ ...v, is_active: e.target.checked })} /> نشط</label>
      </div>
      <button className={btn} disabled={busy} onClick={save}>حفظ</button>
    </Modal>
  )
}
