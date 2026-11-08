import { lazy, Suspense, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Badge, Card, CardHead, Empty, ErrorBox, Meter, Skeleton, Stat, TONE_TEXT, toneOf } from '../components/ui'
import { CAN_CREATE_ASSESSMENT, PERIODS, STATUS_LABELS, deptIcon } from '../lib/constants'
import { fmtDate, fmtPct } from '../lib/format'
import { useDebounce } from '../lib/useDebounce'
import { buildDashboard, useDashboardData, type DashboardModel } from '../features/dashboard/useDashboardData'

const TrendChart = lazy(() => import('../features/dashboard/charts').then((m) => ({ default: m.TrendChart })))
const DeptBarChart = lazy(() => import('../features/dashboard/charts').then((m) => ({ default: m.DeptBarChart })))

const ChartFallback = () => <Skeleton className="h-64 w-full" />

export default function Dashboard() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const [months, setMonths] = useState(6)
  const q = useDashboardData(months, profile!.role, profile!.id)
  const m = useMemo(() => (q.data ? buildDashboard(q.data) : null), [q.data])
  const canCreate = CAN_CREATE_ASSESSMENT.includes(profile!.role)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-linear-to-l from-brand to-brand-2 p-6 text-white shadow-[0_14px_36px_#07598530]">
        <div>
          <h3 className="m-0 mb-1 text-2xl font-bold">الجودة تبدأ بقياس دقيق</h3>
          <p className="m-0 text-sky-100">متابعة موحدة لالتزام الأقسام ونتائج التقييمات.</p>
        </div>
        {canCreate && (
          <button onClick={() => nav('/assessments/new')} className="rounded-xl bg-white px-4 py-3 font-bold text-brand">
            بدء تقييم قسم
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
          aria-label="الفترة"
        >
          {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <button
          onClick={() => q.refetch()}
          disabled={q.isFetching}
          className="rounded-xl border border-[#b6d5e6] bg-white px-3 py-2 text-sm font-bold text-brand disabled:opacity-60"
        >
          {q.isFetching ? 'جارٍ التحديث…' : '↻ تحديث'}
        </button>
      </div>

      {q.isError && <ErrorBox message={(q.error as Error).message} onRetry={() => q.refetch()} />}
      {q.isPending && <DashboardSkeleton />}
      {m && q.data && <DashboardBody m={m} deptCount={q.data.depts.length} />}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-64" />
    </>
  )
}

function DashboardBody({ m, deptCount }: { m: DashboardModel; deptCount: number }) {
  const covered = m.stats.filter((s) => s.count > 0).length
  const attention = m.stats
    .filter((s) => s.count === 0 || (s.avg ?? 100) < 70)
    .sort((a, b) => (a.avg ?? -1) - (b.avg ?? -1))
  const barData = m.stats
    .filter((s) => s.avg != null)
    .map((s) => ({ name: s.dept.name_ar, avg: Math.round((s.avg as number) * 10) / 10 }))
    .sort((a, b) => b.avg - a.avg)
  const avgTone = toneOf(m.avg)

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="الأقسام النشطة" value={deptCount} sub={`${covered} قسم تم تقييمه في الفترة`} />
        <Stat label="التقييمات المعتمدة" value={m.done} sub="معتمد + مغلق" />
        <Stat
          label="متوسط الالتزام"
          value={fmtPct(m.avg)}
          tone={avgTone}
          sub={m.delta == null ? 'للتقييمات المعتمدة' : `${m.delta >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(m.delta * 10) / 10)} نقطة عن الشهر السابق`}
        />
        <Stat label="مسودات غير معتمدة" value={m.drafts} sub="تحتاج استكمال أو اعتماد" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHead title="اتجاه الالتزام الشهري" sub="الخط المتقطع = المستهدف (85%)" />
          {m.monthly.length ? (
            <Suspense fallback={<ChartFallback />}><TrendChart data={m.monthly} /></Suspense>
          ) : (
            <Empty>لا توجد تقييمات معتمدة في هذه الفترة</Empty>
          )}
        </Card>
        <Card>
          <CardHead title="الالتزام حسب المجال" sub="الأضعف أولًا" />
          {m.categories.length ? (
            <ul className="m-0 list-none space-y-3 p-0">
              {m.categories.slice(0, 8).map((c) => (
                <li key={c.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{c.name}</span>
                    <b className={TONE_TEXT[toneOf(c.pct)]}>{fmtPct(c.pct)}</b>
                  </div>
                  <Meter pct={c.pct} tone={toneOf(c.pct)} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>لا توجد بيانات</Empty>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHead title="متوسط الالتزام لكل قسم" />
          {barData.length ? (
            <Suspense fallback={<ChartFallback />}><DeptBarChart data={barData} /></Suspense>
          ) : (
            <Empty>لا توجد تقييمات معتمدة في هذه الفترة</Empty>
          )}
        </Card>
        <Card>
          <CardHead title="أقسام تحتاج متابعة" sub="أقل من 70% أو بدون تقييم في الفترة" />
          {attention.length ? (
            <ul className="m-0 max-h-96 list-none space-y-2 overflow-auto p-0">
              {attention.map((s) => (
                <li key={s.dept.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                  <span>{deptIcon(s.dept.code)} {s.dept.name_ar}</span>
                  {s.count === 0 ? <Badge>لم يُقيَّم</Badge> : <Badge tone={toneOf(s.avg)}>{fmtPct(s.avg)}</Badge>}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>كل الأقسام ملتزمة 🎉</Empty>
          )}
        </Card>
      </div>

      <DeptGrid stats={m.stats} />

      <Card>
        <CardHead title="أحدث التقييمات" action={<Link to="/assessments" className="text-sm font-bold text-brand">عرض الكل</Link>} />
        {m.recent.length ? (
          <div className="overflow-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-start text-slate-600">
                  {['القسم', 'الجولة', 'التاريخ', 'البنود', 'النتيجة', 'الحالة'].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {m.recent.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="p-3">{r.deptName}</td>
                    <td className="p-3">{r.round}</td>
                    <td className="p-3">{fmtDate(r.assessment_date)}</td>
                    <td className="p-3">{r.items_scored}{r.items_na ? ` (+${r.items_na} N/A)` : ''}</td>
                    <td className="p-3"><b className={TONE_TEXT[toneOf(r.pct)]}>{fmtPct(r.pct)}</b></td>
                    <td className="p-3"><Badge tone={r.status === 'draft' ? 'none' : 'good'}>{STATUS_LABELS[r.status]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>لا توجد تقييمات بعد</Empty>
        )}
      </Card>
    </>
  )
}

function DeptGrid({ stats }: { stats: DashboardModel['stats'] }) {
  const [search, setSearch] = useState('')
  const [all, setAll] = useState(false)
  const term = useDebounce(search.trim().toLowerCase())
  const filtered = useMemo(
    () => stats.filter((s) => !term || `${s.dept.name_ar} ${s.dept.name_en} ${s.dept.code}`.toLowerCase().includes(term)),
    [stats, term],
  )
  const shown = all || term ? filtered : filtered.slice(0, 6)

  return (
    <Card>
      <CardHead
        title="الأقسام"
        action={
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم القسم..."
            className="w-52 rounded-xl border border-line px-3 py-2 text-sm"
          />
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((s) => {
          const tone = toneOf(s.avg)
          return (
            <Link
              key={s.dept.id}
              to={`/departments/${s.dept.id}`}
              className="rounded-2xl border border-[#e4ebf2] bg-white p-4 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="grid size-11 place-items-center rounded-xl bg-sky-50 text-xl">{deptIcon(s.dept.code)}</div>
                <Badge tone={s.count ? 'good' : 'none'}>{s.count ? `${s.count} تقييم` : 'لم يبدأ'}</Badge>
              </div>
              <h4 className="mt-3 mb-1 font-bold">{s.dept.name_ar}</h4>
              <small className="text-muted">{s.dept.name_en || s.dept.code}</small>
              <div className="my-3"><Meter pct={s.avg} tone={tone} /></div>
              <div className="flex justify-between text-xs">
                <span className={TONE_TEXT[tone]}>{s.avg != null ? `متوسط ${fmtPct(s.avg)}` : 'لا توجد نتائج'}</span>
                <span className="text-muted">{s.latestDate ? `آخر: ${fmtDate(s.latestDate)}` : ''}</span>
              </div>
            </Link>
          )
        })}
      </div>
      {!shown.length && <Empty>لا توجد أقسام مطابقة</Empty>}
      {!term && filtered.length > 6 && (
        <div className="mt-4 text-center">
          <button onClick={() => setAll((v) => !v)} className="rounded-xl border border-[#b6d5e6] px-4 py-2 text-sm font-bold text-brand">
            {all ? 'عرض أقل' : `عرض كل الأقسام (${filtered.length})`}
          </button>
        </div>
      )}
    </Card>
  )
}
