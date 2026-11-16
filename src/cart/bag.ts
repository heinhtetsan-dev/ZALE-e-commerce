// ============================================================
// bag.ts — ဈေးခြင်း drawer (ဘေးကနေပွင့်လာတဲ့ panel) ရဲ့
// ပွင့်/ပိတ် အခြေအနေကို ဝေမျှဖို့ Context။
// သတိပြုရန်: ဒီဖိုင်က UI အခြေအနေပဲ ကိုင်တယ် —
// ခြင်းထဲက ပစ္စည်းတွေကတော့ useCart.ts က ကိုင်တယ်။
// ============================================================

import { createContext, useContext } from 'react'

export interface BagState {
  isOpen: boolean // drawer ပွင့်နေလား
  /** Variant just added, highlighted in the drawer. */
  // (အခုလေးတင် ထည့်လိုက်တဲ့ ပစ္စည်းကို drawer ထဲမှာ အရောင်ပြောင်းပြဖို့)
  justAdded: string | null
  open: (justAdded?: string) => void
  close: () => void
}

export const BagContext = createContext<BagState | null>(null)

// Drawer ကို ဖွင့်/ပိတ်ချင်တဲ့ component တိုင်းက ဒီ hook ကိုသုံးတယ်။
// BagProvider အပြင်ဘက်မှာ သုံးမိရင် error ချက်ချင်းပြလို့ bug ရှာရလွယ်တယ်။
export function useBag() {
  const ctx = useContext(BagContext)
  if (!ctx) throw new Error('useBag must be used inside BagProvider')
  return ctx
}
