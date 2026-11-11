import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { BagContext, type BagState } from './bag'

export function BagProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  const open = useCallback((added?: string) => {
    setJustAdded(added ?? null)
    setOpen(true)
  }, [])
  const close = useCallback(() => setOpen(false), [])

  const value = useMemo<BagState>(() => ({ isOpen, justAdded, open, close }), [isOpen, justAdded, open, close])
  return <BagContext.Provider value={value}>{children}</BagContext.Provider>
}
