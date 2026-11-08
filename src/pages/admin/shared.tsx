import type { ReactNode } from 'react'
export const inp = 'w-full rounded-xl border border-line p-2.5 disabled:bg-slate-50'
export const btn = 'rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60'
export const btnOut = 'rounded-xl border border-[#b6d5e6] bg-white px-3 py-2 text-sm font-bold text-brand disabled:opacity-60'
export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="mb-3">
    <label className="mb-1 block text-xs text-muted">{label}</label>
    {children}
  </div>
)
