import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { Badge, Card, ErrorBox, Skeleton, TONE_TEXT, toneOf } from '../components/ui'
import { useToast } from '../components/Toast'
import { CAN_CREATE_ASSESSMENT, STATUS_LABELS } from '../lib/constants'
import { fmtPct } from '../lib/format'
import { useDepartments, useRoundsCount } from '../lib/queries'
import { RESULTS, calcScore, itemScore } from '../lib/scoring'
import { supabase } from '../lib/supabase'
import { check, useAction } from '../lib/useAction'
import type { AssessmentStatus, ResultValue } from '../lib/types'

interface Row {
  key: string
  row_id?: string
  criterion_id: string | null
  code: string
  title: string
  category: string
  verification: string
  max: number
  allow_na: boolean
  result: ResultValue
  note: string
}
interface AssessmentRec {
  id: string
  assessment_date: string
  department_id: string
  evaluator_id: string
  status: AssessmentStatus
  notes: string
  round: number
}
interface ItemRec { id: string; criterion_id: string | null; code_snapshot: string; title_snapshot: string; category_snapshot: string; max_score_snapshot: number; result: ResultValue | null; note: string }
interface CritEmbed { id: string; code: string; title_ar: string; category: string; verification_method: string; max_score: number; allow_na: boolean; is_active: boolean }

const today = () => new Date().toISOString().slice(0, 10)

export default function AssessmentForm() {
  const { id } = useParams()
  const isNew = !id
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const depts = useDepartments()
  const roundsCount = useRoundsCount()
  const dept = sp.get('dept') ?? ''
  const round = Number(sp.get('round')) || 1
  const year = Number(sp.get('year')) || new Date().getFullYear()
  const canCreate = CAN_CREATE_ASSESSMENT.includes(profile!.role)

  // لو فيه تقييم لنفس القسم/الجولة/السنة → افتحه بدل ما نكرره
  const existing = useQuery({
    enabled: isNew && !!dept,
    queryKey: ['assessment-existing', dept, round, year],
    queryFn: async () => {
      const r = await supabase.from('assessments').select('id').eq('department_id', dept).eq('round', round)
        .gte('assessment_date', `${year}-01-01`).lte('assessment_date', `${year}-12-31`).limit(1).maybeSingle()
      return check(r) as { id: string } | null
    },
  })
  useEffect(() => {
    if (existing.data?.id) nav(`/assessments/${existing.data.id}`, { replace: true })
  }, [existing.data, nav])

  const data = useQuery({
    enabled: !!id || (!!dept && existing.isSuccess && !existing.data),
    queryKey: ['assessment-form', id ?? `new:${dept}`],
    staleTime: 0,
    queryFn: async () => {
      let a: AssessmentRec | null = null
      let items: ItemRec[] = []
      if (id) {
        const [ar, ir] = await Promise.all([
          supabase.from('assessments').select('id,assessment_date,department_id,evaluator_id,status,notes,round').eq('id', id).maybeSingle(),
          supabase.from('assessment_items').select('id,criterion_id,code_snapshot,title_snapshot,category_snapshot,max_score_snapshot,result,note').eq('assessment_id', id),
        ])
        a = check(ar) as AssessmentRec | null
        items = (check(ir) ?? []) as ItemRec[]
        if (!a) return { a: null, rows: [] as Row[] }
      }
      const deptId = a?.department_id ?? dept
      const dc = check(await supabase.from('department_criteria')
        .select('sort_order, criteria(id,code,title_ar,category,verification_method,max_score,allow_na,is_active)')
        .eq('department_id', deptId).order('sort_order'))
      const crits = ((dc ?? []) as unknown as { criteria: CritEmbed | null }[]).map((x) => x.criteria).filter((c): c is CritEmbed => !!c)
      const byCrit = new Map(items.filter((i) => i.criterion_id).map((i) => [i.criterion_id as string, i]))
      const used = new Set<string>()
      const rows: Row[] = []
      for (const c of crits) {
        const it = byCrit.get(c.id)
        if (!it && !c.is_active) continue
        if (it) used.add(it.id)
        rows.push({
          key: c.id, row_id: it?.id, criterion_id: c.id,
          code: it?.code_snapshot ?? c.code, title: it?.title_snapshot ?? c.title_ar,
          category: (it?.category_snapshot ?? c.category) || 'عام', verification: c.verification_method,
          max: Number(it?.max_score_snapshot ?? c.max_score), allow_na: c.allow_na,
          result: (it?.result ?? '') as ResultValue, note: it?.note ?? '',
        })
      }
      for (const it of items) {
        if (used.has(it.id)) continue
        rows.push({
          key: it.id, row_id: it.id, criterion_id: it.criterion_id, code: it.code_snapshot, title: it.title_snapshot,
          category: it.category_snapshot || 'عام', verification: '', max: Number(it.max_score_snapshot), allow_na: true,
          result: (it.result ?? '') as ResultValue, note: it.note,
        })
      }
      return { a, rows }
    },
  })

  const deptId = data.data?.a?.department_id ?? dept
  const deptName = depts.data?.find((d) => d.id === deptId)?.name_ar ?? ''

  if (!isNew && data.isSuccess && !data.data.a) return <Card className="py-12 text-center font-bold">التقييم غير موجود أو غير مصرح لك بعرضه</Card>

  return (
    <div className="space-y-4">
      <Link to={deptId ? `/departments/${deptId}?year=${year}` : '/assessments'} className="font-bold text-brand print:hidden">← رجوع</Link>

      {isNew && (
        <Card className="print:hidden">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-muted">القسم</label>
              <select value={dept} onChange={(e) => setSp({ dept: e.target.value, round: String(round), year: String(year) }, { replace: true })} className="w-full rounded-xl border border-line bg-white p-2.5">
                <option value="">اختر القسم…</option>
                {depts.data?.map((d) => <option key={d.id} value={d.id}>{d.name_ar}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">رقم الجولة</label>
              <select value={round} onChange={(e) => setSp({ dept, round: e.target.value, year: String(year) }, { replace: true })} className="w-full rounded-xl border border-line bg-white p-2.5">
                {Array.from({ length: Math.max(roundsCount.data ?? 4, round) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>الجولة {n}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">السنة</label>
              <input value={year} readOnly className="w-full rounded-xl border border-line bg-slate-50 p-2.5" />
            </div>
          </div>
          {!canCreate && <p className="m-0 mt-3 text-sm text-bad">دورك لا يسمح بإنشاء تقييمات.</p>}
        </Card>
      )}

      {isNew && !dept && <Card className="py-10 text-center text-muted">اختر القسم لبدء التقييم</Card>}
      {data.error && <ErrorBox message={(data.error as Error).message} onRetry={() => data.refetch()} />}
      {(data.isFetching && !data.data) && <Skeleton className="h-96" />}
      {data.data && (isNew ? !existing.data : data.data.a) && (
        <FormBody
          key={`${id ?? dept}-${round}-${year}`}
          a={data.data.a}
          initialRows={data.data.rows}
          deptId={deptId}
          deptName={deptName}
          round={data.data.a?.round ?? round}
          year={data.data.a ? Number(data.data.a.assessment_date.slice(0, 4)) : year}
        />
      )}
    </div>
  )
}

const ItemRow = memo(function ItemRow({ r, onChange, disabled }: { r: Row; onChange: (key: string, patch: Partial<Row>) => void; disabled: boolean }) {
  return (
    <div className="grid gap-2 border-b border-slate-100 py-3 md:grid-cols-[90px_1fr_190px_220px] md:items-start">
      <b className="text-sm text-brand">{r.code}</b>
      <div>
        <p className="m-0 text-sm leading-relaxed">{r.title}</p>
        {r.verification && <small className="text-muted">{r.verification}</small>}
      </div>
      <select
        value={r.result} disabled={disabled} aria-label={`نتيجة ${r.code}`}
        onChange={(e) => onChange(r.key, { result: e.target.value as ResultValue })}
        className={`rounded-lg border p-2 text-sm ${r.result === '' ? 'border-orange-300 bg-orange-50' : 'border-line bg-white'}`}
      >
        <option value="">اختر</option>
        {RESULTS.filter((o) => o.v !== 'na' || r.allow_na).map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
      <input
        value={r.note} disabled={disabled} placeholder="ملاحظة اختيارية" aria-label={`ملاحظة ${r.code}`}
        onChange={(e) => onChange(r.key, { note: e.target.value })}
        className="rounded-lg border border-line p-2 text-sm"
      />
    </div>
  )
})

function FormBody({ a, initialRows, deptId, deptName, round, year }: { a: AssessmentRec | null; initialRows: Row[]; deptId: string; deptName: string; round: number; year: number }) {
  const { profile } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const { run, busy } = useAction()
  const [rows, setRows] = useState(initialRows)
  const [date, setDate] = useState(a?.assessment_date ?? (year === new Date().getFullYear() ? today() : `${year}-01-01`))
  const [notes, setNotes] = useState(a?.notes ?? '')
  const status = a?.status ?? 'draft'
  const isAdmin = profile!.role === 'super_admin' || profile!.role === 'quality_admin'
  const canCreate = CAN_CREATE_ASSESSMENT.includes(profile!.role)
  const editable = a ? isAdmin || (status === 'draft' && a.evaluator_id === profile!.id && canCreate) : canCreate

  const evaluator = useQuery({
    enabled: !!a,
    queryKey: ['profile-name', a?.evaluator_id],
    staleTime: 300_000,
    queryFn: async () => (await supabase.from('profiles').select('full_name').eq('id', a!.evaluator_id).maybeSingle()).data?.full_name as string | undefined,
  })

  const onChange = useCallback((key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r))), [])
  const s = useMemo(() => calcScore(rows.map((r) => ({ result: r.result, max: r.max }))), [rows])
  const groups = useMemo(() => {
    const m = new Map<string, Row[]>()
    for (const r of rows) m.set(r.category, [...(m.get(r.category) ?? []), r])
    return [...m.entries()]
  }, [rows])
  const remaining = rows.filter((r) => r.result === '').length

  async function save(approve: boolean) {
    if (!rows.length) return toast('القسم ده مفيهوش معايير. اربط معايير بالقسم من شاشة الإدارة.', 'err')
    if (approve && remaining) return toast(`باقي ${remaining} بند بدون تقييم`, 'err')
    const aid = await run(async () => {
      let id = a?.id
      if (!id) {
        id = (check(await supabase.from('assessments').insert({ assessment_date: date, department_id: deptId, evaluator_id: profile!.id, status: 'draft', notes, round }).select('id').single()) as { id: string }).id
      } else {
        check(await supabase.from('assessments').update({ assessment_date: date, notes }).eq('id', id))
      }
      const items = rows.map((r) => ({
        criterion_id: r.criterion_id, row_id: r.row_id, code: r.code, title: r.title, category: r.category, max: r.max,
        result: r.result, score: r.result ? itemScore(r.result, r.max) : 0, note: r.note,
      }))
      check(await supabase.rpc('save_assessment_items', { p_assessment_id: id, p_items: items }))
      if (approve) check(await supabase.from('assessments').update({ status: 'approved' }).eq('id', id))
      return id
    }, approve ? 'تم اعتماد التقييم' : 'تم حفظ المسودة')
    if (aid && (!a || approve)) nav(`/assessments/${aid}`, { replace: !a })
  }

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="m-0 text-xl font-bold">{a ? 'تقييم' : 'تقييم جديد —'} {deptName}</h3>
            <small className="text-muted">
              الجولة {round} · {year}{evaluator.data ? ` · المقيّم: ${evaluator.data}` : ''} · يتم استبعاد N/A تلقائيًا من المقام
            </small>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Badge tone={status === 'draft' ? 'warn' : 'good'}>{STATUS_LABELS[status]}</Badge>
            {a && <button onClick={() => window.print()} className="rounded-lg border border-[#b6d5e6] px-3 py-2 text-sm font-bold text-brand">طباعة</button>}
            {editable && <button disabled={busy} onClick={() => save(false)} className="rounded-lg border border-[#b6d5e6] px-3 py-2 text-sm font-bold text-brand disabled:opacity-60">حفظ مسودة</button>}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-muted">تاريخ التقييم</label>
            <input type="date" value={date} disabled={!editable} min={`${year}-01-01`} max={`${year}-12-31`} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-line p-2.5" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">ملاحظات عامة</label>
            <input value={notes} disabled={!editable} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl border border-line p-2.5" />
          </div>
        </div>
        {a && !editable && <p className="m-0 mt-3 text-sm text-muted">التقييم للعرض فقط{status !== 'draft' ? ' — تم اعتماده' : ''}.</p>}
      </Card>

      {!rows.length && <Card className="py-10 text-center text-muted">لا توجد معايير مرتبطة بالقسم ده.</Card>}
      {groups.map(([cat, list]) => (
        <div key={cat}>
          <div className="mb-2 rounded-xl bg-nav px-4 py-3 font-bold text-white">{cat} <span className="text-sm font-normal text-sky-200">({list.length})</span></div>
          <Card className="py-2">
            {list.map((r) => <ItemRow key={r.key} r={r} onChange={onChange} disabled={!editable} />)}
          </Card>
        </div>
      ))}

      <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-nav px-5 py-4 text-white shadow-xl print:hidden">
        <div>
          <small className="text-sky-200">نسبة الالتزام الحالية</small><br />
          <b className={`text-2xl ${s.pct == null ? '' : TONE_TEXT[toneOf(s.pct)] === 'text-bad' ? 'text-red-300' : TONE_TEXT[toneOf(s.pct)] === 'text-warn' ? 'text-amber-300' : 'text-green-300'}`}>{fmtPct(s.pct)}</b>
        </div>
        <span className="text-sm">{s.scored ? `تم تقييم ${s.scored} من ${rows.length} بند · غير منطبق: ${s.na}` : 'لم يتم تقييم أي بند'}</span>
        {editable && status === 'draft' && (
          <button disabled={busy} onClick={() => save(true)} className="rounded-xl bg-white px-4 py-2.5 font-bold text-brand disabled:opacity-60">اعتماد التقييم</button>
        )}
        {editable && status !== 'draft' && (
          <button disabled={busy} onClick={() => save(false)} className="rounded-xl bg-white px-4 py-2.5 font-bold text-brand disabled:opacity-60">حفظ التعديلات</button>
        )}
      </div>
    </>
  )
}
