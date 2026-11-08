import type { ReactNode } from 'react'

export default function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`max-h-[90vh] w-full overflow-auto rounded-2xl bg-white p-6 shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-2xl leading-none text-muted" aria-label="إغلاق">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
