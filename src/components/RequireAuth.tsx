// ============================================================
// RequireAuth.tsx — "Login ဝင်ထားမှ ကြည့်လို့ရတဲ့ page" တွေရဲ့
// တံခါးစောင့်။ router.tsx မှာ checkout, account, admin စတဲ့
// page တွေကို ဒီ component နဲ့ ပတ်ထားတယ်။
// ============================================================

import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/context'
import { Spinner } from './ui'

export function RequireAuth({ children, role }: { children: ReactNode; role?: 'ADMIN' }) {
  const { user, isLoading, signedOut } = useAuth()
  const location = useLocation()

  // User data server ကနေ စောင့်နေဆဲ — ဘာမှ မဆုံးဖြတ်သေးဘဲ spinner ပြထား
  if (isLoading) return <Spinner />

  // ကိုယ်တိုင် logout နှိပ်ထွက်တာ — home ကို ပြန်ပို့ (login form ပြစရာမလို)
  if (!user && signedOut) return <Navigate to="/" replace />

  // Login မဝင်ရသေး — login page ပို့ပြီး "ဘယ်ကလာတာလဲ" (from) ကို မှတ်ပေးလိုက်တယ်။
  // Login ဝင်ပြီးရင် အဲ့ဒီ page ကို ပြန်ရောက်အောင်။
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />

  // ADMIN page ကို သာမန် user ဝင်ကြည့်ရင် — home ပြန်ပို့
  if (role && user.role !== role) return <Navigate to="/" replace />

  // အားလုံးအဆင်ပြေရင် page ကို ပုံမှန်ပြ
  return <>{children}</>
}
