import type { ResultValue } from './types'

export const RESULTS: { v: ResultValue; label: string }[] = [
  { v: '2', label: 'مستوفى (2)' },
  { v: '1', label: 'مستوفى جزئيًا (1)' },
  { v: '0', label: 'غير مستوفى (0)' },
  { v: 'na', label: 'غير منطبق N/A' },
]
// الدرجة نسبية لأقصى درجة للمعيار: 2 → كاملة، 1 → نصف، 0 → صفر
export const itemScore = (r: ResultValue, max: number) => (r === '2' ? max : r === '1' ? max / 2 : 0)

export function calcScore(items: { result: ResultValue; max: number }[]) {
  let got = 0, max = 0, scored = 0, na = 0
  for (const i of items) {
    if (i.result === 'na') na++
    else if (i.result !== '') { got += itemScore(i.result, i.max); max += i.max; scored++ }
  }
  return { got, max, scored, na, pct: max ? Math.round((got / max) * 1000) / 10 : null }
}
