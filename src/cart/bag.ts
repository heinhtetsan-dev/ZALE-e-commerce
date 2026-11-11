import { createContext, useContext } from 'react'

export interface BagState {
  isOpen: boolean
  /** Variant just added, highlighted in the drawer. */
  justAdded: string | null
  open: (justAdded?: string) => void
  close: () => void
}

export const BagContext = createContext<BagState | null>(null)

export function useBag() {
  const ctx = useContext(BagContext)
  if (!ctx) throw new Error('useBag must be used inside BagProvider')
  return ctx
}
