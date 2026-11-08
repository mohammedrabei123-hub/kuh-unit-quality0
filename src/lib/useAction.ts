import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '../components/Toast'

// تشغيل عملية كتابة: busy + toast + مسح الكاش بعد النجاح
export function useAction() {
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const qc = useQueryClient()
  async function run<T>(fn: () => Promise<T>, okMsg?: string): Promise<T | undefined> {
    setBusy(true)
    try {
      const r = await fn()
      if (okMsg) toast(okMsg)
      await qc.invalidateQueries()
      return r
    } catch (e) {
      toast((e as { message?: string }).message ?? 'حدث خطأ', 'err')
      return undefined
    } finally {
      setBusy(false)
    }
  }
  return { run, busy }
}
export const check = <T,>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message)
  return r.data
}
