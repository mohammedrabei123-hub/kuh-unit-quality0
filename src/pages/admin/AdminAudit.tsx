import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, ErrorBox, Skeleton } from '../../components/ui'
import Modal from '../../components/Modal'
import { supabase } from '../../lib/supabase'
import { check } from '../../lib/useAction'
import { btnOut } from './shared'

interface Log { id: number; user_id: string | null; action: string; table_name: string; record_id: string | null; old_data: unknown; new_data: unknown; created_at: string }
const PAGE = 30
const ACTIONS: Record<string, string> = { insert: 'إضافة', update: 'تعديل', delete: 'حذف' }
const TABLES = ['assessments', 'assessment_items', 'departments', 'criteria', 'department_criteria', 'user_departments', 'profiles']
const when = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { dateStyle: 'short', timeStyle: 'short' })

export default function AdminAudit() {
  const [page, setPage] = useState(0)
  const [table, setTable] = useState('')
  const [view, setView] = useState<Log | null>(null)
  const q = useQuery({
    queryKey: ['audit', page, table],
    placeholderData: (p) => p,
    queryFn: async () => {
      let qb = supabase.from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1)
      if (table) qb = qb.eq('table_name', table)
      const r = await qb
      const rows = (check({ data: r.data, error: r.error }) ?? []) as Log[]
      const ids = [...new Set(rows.map((x) => x.user_id).filter(Boolean))] as string[]
      const names = new Map<string, string>()
      if (ids.length) for (const p of (await supabase.from('profiles').select('id,full_name,email').in('id', ids)).data ?? []) names.set(p.id, p.full_name || p.email)
      return { rows, names, count: r.count ?? 0 }
    },
  })
  const pages = Math.max(1, Math.ceil((q.data?.count ?? 0) / PAGE))
  return (
    <Card>
      <select className="mb-4 rounded-xl border border-line bg-white px-3 py-2 text-sm" value={table} onChange={(e) => { setTable(e.target.value); setPage(0) }} aria-label="الجدول">
        <option value="">كل الجداول</option>
        {TABLES.map((t) => <option key={t}>{t}</option>)}
      </select>
      {q.error && <ErrorBox message={(q.error as Error).message} />}
      {q.isPending && <Skeleton className="h-48" />}
      <div className="overflow-auto">
        <table className="w-full min-w-[640px] text-sm">
          <tbody>
            {q.data?.rows.map((l) => (
              <tr key={l.id} className="border-b border-slate-100">
                <td className="p-3 whitespace-nowrap text-muted">{when.format(new Date(l.created_at))}</td>
                <td className="p-3">{(l.user_id && q.data.names.get(l.user_id)) || 'النظام'}</td>
                <td className="p-3 font-bold">{ACTIONS[l.action] ?? l.action}</td>
                <td className="p-3" dir="ltr">{l.table_name}</td>
                <td className="p-3 text-end"><button className={btnOut} onClick={() => setView(l)}>تفاصيل</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted">{q.data?.count ?? 0} سجل</span>
        <div className="flex items-center gap-2">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">السابق</button>
          <span>{page + 1} / {pages}</span>
          <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">التالي</button>
        </div>
      </div>
      {view && (
        <Modal wide title={`${ACTIONS[view.action] ?? view.action} — ${view.table_name}`} onClose={() => setView(null)}>
          <pre dir="ltr" className="max-h-[60vh] overflow-auto rounded-xl bg-slate-50 p-3 text-xs">{JSON.stringify({ old: view.old_data, new: view.new_data }, null, 2)}</pre>
        </Modal>
      )}
    </Card>
  )
}
