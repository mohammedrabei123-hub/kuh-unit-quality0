import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Card, CardHead, ErrorBox, Skeleton, Stat, TONE_BADGE, toneOf } from '../components/ui'
import { downloadCsv } from '../lib/csv'
import { fmtPct } from '../lib/format'
import { pickByRound, roundsList, useDepartments, useRoundsCount, useYearScores, yearOptions } from '../lib/queries'

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)

export default function Reports() {
  const [year, setYear] = useState(new Date().getFullYear())
  const depts = useDepartments()
  const rc = useRoundsCount()
  const scores = useYearScores(year)

  const m = useMemo(() => {
    if (!depts.data || !scores.data) return null
    const by = pickByRound(scores.data)
    const rounds = roundsList(rc.data ?? 4, scores.data)
    const rows = depts.data.map((d) => {
      const cells = rounds.map((n) => by.get(`${d.id}|${n}`) ?? null)
      const vals = cells.filter((c) => c && c.status !== 'draft' && c.pct != null).map((c) => c!.pct as number)
      return { dept: d, cells, done: vals.length, avg: mean(vals) }
    })
    const roundAvg = rounds.map((_, i) => mean(rows.map((r) => r.cells[i]).filter((c) => c && c.status !== 'draft' && c.pct != null).map((c) => c!.pct as number)))
    const all = rows.flatMap((r) => r.cells).filter((c) => c && c.status !== 'draft' && c.pct != null).map((c) => c!.pct as number)
    return { rounds, rows, roundAvg, total: all.length, avg: mean(all), planned: rows.length * rounds.length }
  }, [depts.data, scores.data, rc.data])

  function exportCsv() {
    if (!m) return
    downloadCsv(`تقرير-الجودة-${year}.csv`, [
      ['القسم', ...m.rounds.map((n) => `الجولة ${n}`), 'عدد الجولات المكتملة', 'المتوسط'],
      ...m.rows.map((r) => [r.dept.name_ar, ...r.cells.map((c) => (c ? (c.status === 'draft' ? 'مسودة' : c.pct) : '')), r.done, r.avg == null ? '' : Math.round(r.avg * 10) / 10]),
      ['المتوسط العام', ...m.roundAvg.map((v) => (v == null ? '' : Math.round(v * 10) / 10)), m.total, m.avg == null ? '' : Math.round(m.avg * 10) / 10],
    ])
  }
  const err = depts.error ?? scores.error

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-xl border border-line bg-white px-3 py-2" aria-label="السنة">
          {yearOptions().map((y) => <option key={y}>{y}</option>)}
        </select>
        <div className="flex gap-2">
          <button onClick={exportCsv} disabled={!m} className="rounded-xl border border-[#b6d5e6] bg-white px-4 py-2 text-sm font-bold text-brand disabled:opacity-50">تصدير CSV</button>
          <button onClick={() => window.print()} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white">طباعة / PDF</button>
        </div>
      </div>
      {err && <ErrorBox message={(err as Error).message} />}
      {!m && !err && <Skeleton className="h-96" />}
      {m && (
        <>
          <h2 className="m-0 hidden text-xl font-bold print:block">تقرير الالتزام — {year}</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="الأقسام" value={m.rows.length} />
            <Stat label="الجولات المخططة" value={m.planned} sub={`${m.rounds.length} جولات لكل قسم`} />
            <Stat label="نتائج معتمدة" value={m.total} />
            <Stat label="متوسط النتائج" value={fmtPct(m.avg)} tone={toneOf(m.avg)} />
          </div>
          <Card>
            <CardHead title="مصفوفة الالتزام: الأقسام × الجولات" sub="آخر تقييم لكل جولة" />
            <div className="overflow-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="p-3 text-start">القسم</th>
                    {m.rounds.map((n) => <th key={n} className="p-3 text-center">جولة {n}</th>)}
                    <th className="p-3 text-center">المتوسط</th>
                  </tr>
                </thead>
                <tbody>
                  {m.rows.map((r) => (
                    <tr key={r.dept.id} className="border-b border-slate-100">
                      <td className="p-3"><Link to={`/departments/${r.dept.id}?year=${year}`} className="font-bold text-brand">{r.dept.name_ar}</Link></td>
                      {r.cells.map((c, i) => (
                        <td key={i} className="p-3 text-center">
                          {!c ? <span className="text-slate-300">—</span> : c.status === 'draft' ? <Badge tone="warn">مسودة</Badge> :
                            <Link to={`/assessments/${c.id}`} className={`rounded-full px-2.5 py-1 text-xs font-bold ${TONE_BADGE[toneOf(c.pct)]}`}>{fmtPct(c.pct)}</Link>}
                        </td>
                      ))}
                      <td className="p-3 text-center font-bold">{fmtPct(r.avg)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td className="p-3">المتوسط العام</td>
                    {m.roundAvg.map((v, i) => <td key={i} className="p-3 text-center">{fmtPct(v)}</td>)}
                    <td className="p-3 text-center">{fmtPct(m.avg)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
