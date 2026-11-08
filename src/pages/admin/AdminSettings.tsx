import { useState } from 'react'
import { Card, Skeleton } from '../../components/ui'
import { useRoundsCount } from '../../lib/queries'
import { supabase } from '../../lib/supabase'
import { check, useAction } from '../../lib/useAction'
import { Field, btn, inp } from './shared'

export default function AdminSettings() {
  const q = useRoundsCount()
  if (q.isPending) return <Skeleton className="h-40" />
  return <RoundsForm initial={q.data ?? 4} />
}

function RoundsForm({ initial }: { initial: number }) {
  const [n, setN] = useState(initial)
  const { run, busy } = useAction()
  const valid = Number.isInteger(n) && n >= 1 && n <= 12
  return (
    <Card className="max-w-md">
      <h3 className="mt-0 font-bold">عدد جولات التقييم في السنة</h3>
      <p className="text-sm text-muted">بيتطبق على كل الأقسام. تقليل العدد مبيمسحش تقييمات جولات موجودة بالفعل.</p>
      <Field label="عدد الجولات (1 – 12)">
        <input className={inp} type="number" min={1} max={12} value={n} onChange={(e) => setN(Number(e.target.value))} />
      </Field>
      <button
        className={btn}
        disabled={busy || !valid || n === initial}
        onClick={() => run(async () => check(await supabase.from('app_settings').upsert({ key: 'rounds_count', value: n })), 'تم حفظ الإعدادات')}
      >
        حفظ
      </button>
    </Card>
  )
}
