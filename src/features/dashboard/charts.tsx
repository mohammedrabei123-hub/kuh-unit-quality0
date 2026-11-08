// ملف منفصل بيتحمّل lazy عشان recharts ما يتقلش الـ bundle الأساسي
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { THRESHOLDS } from '../../lib/constants'
import { fmtMonth } from '../../lib/format'
import { TONE_HEX, toneOf } from '../../components/ui'
import type { DashboardModel } from './useDashboardData'

const tick = { fontSize: 12, fill: '#64748b' }

export function TrendChart({ data }: { data: DashboardModel['monthly'] }) {
  const rows = data.map((m) => ({ ...m, label: fmtMonth(m.month) }))
  return (
    <div dir="ltr" className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#e8eef3" vertical={false} />
          <XAxis dataKey="label" tick={tick} tickLine={false} />
          <YAxis domain={[0, 100]} tick={tick} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => `${v}%`} labelFormatter={(l) => String(l)} />
          <ReferenceLine y={THRESHOLDS.good} stroke="#15803d" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="avg" name="متوسط الالتزام" stroke="#075985" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DeptBarChart({ data }: { data: { name: string; avg: number }[] }) {
  return (
    <div dir="ltr" style={{ height: data.length * 36 + 40 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e8eef3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={tick} tickLine={false} />
          <YAxis type="category" dataKey="name" width={150} tick={tick} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => `${v}%`} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="avg" name="متوسط الالتزام" radius={[0, 6, 6, 0]} barSize={18}>
            {data.map((d) => (
              <Cell key={d.name} fill={TONE_HEX[toneOf(d.avg)]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
