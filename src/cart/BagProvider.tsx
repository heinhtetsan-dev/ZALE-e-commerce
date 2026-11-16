import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { BagContext, type BagState } from './bag'

export function BagProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false) // drawer ပွင့်/ပိတ်
  const [justAdded, setJustAdded] = useState<string | null>(null)

  // Drawer ဖွင့် ပစ္စည်းအသစ်ထည့်ပြီးဖွင့်တာဆိုရင် အဲ့ဒီ variant id ပါလာတယ်
  const open = useCallback((added?: string) => {
    setJustAdded(added ?? null)
    setOpen(true)
  }, [])

  // bag ထဲ rerender မဖြစ်အောင်
  const close = useCallback(() => setOpen(false), [])
  const value = useMemo<BagState>(() => ({ isOpen, justAdded, open, close }), [isOpen, justAdded, open, close])
  return <BagContext.Provider value={value}>{children}</BagContext.Provider>
}
