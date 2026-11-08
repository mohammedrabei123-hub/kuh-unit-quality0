import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type Kind = 'ok' | 'err'
const Ctx = createContext<(msg: string, kind?: Kind) => void>(() => {})
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; kind: Kind } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const show = useCallback((msg: string, kind: Kind = 'ok') => {
    setT({ msg, kind })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setT(null), 3500)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      {t && (
        <div
          role="status"
          className={`fixed bottom-6 start-6 z-50 max-w-sm rounded-xl px-4 py-3 text-sm font-bold text-white shadow-xl print:hidden ${t.kind === 'ok' ? 'bg-[#123d57]' : 'bg-red-700'}`}
        >
          {t.msg}
        </div>
      )}
    </Ctx.Provider>
  )
}
