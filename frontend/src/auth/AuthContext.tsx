
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { guestCart } from '../cart/guestCart'
import { forgetSavedAddress } from '../checkout/savedAddress'
import { api, setUnauthorizedHandler, tokenStore } from '../lib/api'
import type { ServerCart, User } from '../lib/types'
import { AuthContext, type AuthState } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState(tokenStore.get)

  const me = useQuery({
    queryKey: ['me', token],
    queryFn: () => api<{ user: User }>('/auth/me').then((r) => r.user),
    enabled: !!token,
    staleTime: 5 * 60_000, // user info ကို ၅ မိနစ် cache ထားတယ်
    retry: false,
  })

  const [signedOut, setSignedOut] = useState(false)
  const endSession = useCallback(() => {
    tokenStore.set(null) // localStorage ထဲက token ဖျက်
    setToken(null)
    forgetSavedAddress() // သိမ်းထားတဲ့ ပို့ဆောင်ရေးလိပ်စာ ဖျက်
   

    queryClient.removeQueries({ predicate: (q) => !['products', 'product', 'facets', 'reviews'].includes(String(q.queryKey[0])) })
  }, [queryClient])

  // user signout session end 
  const logout = useCallback(() => {
    setSignedOut(true) 
    endSession()
  }, [endSession])


  useEffect(() => setUnauthorizedHandler(endSession), [endSession])

  // Login/Register အပြီး session စတင်တဲ့အလုပ်
  const startSession = useCallback(
    async ({ token: newToken, user }: { token: string; user: User }) => {
      tokenStore.set(newToken) // token ကို localStorage ထဲသိမ်း
      setSignedOut(false)

      // Server ထပ်မမေးရအောင် user data ကို cache ထဲ ကြိုထည့်ထားတယ်
      queryClient.setQueryData(['me', newToken], user)
      setToken(newToken)
      const pending = guestCart.items()
      if (pending.length) {
        try {
          const cart = await api<ServerCart>('/cart/merge', {
            method: 'POST',
            body: { items: pending.map((i) => ({ variantId: i.variantId, quantity: i.quantity })) },
          })
          queryClient.setQueryData(['cart'], cart)
          guestCart.clear() // merge ပြီးမှ guest cart ကို ရှင်းတယ်
        } catch {
        }
      }
      return user
    },
    [queryClient],
  )


  const value = useMemo<AuthState>(
    () => ({
      user: token ? (me.data ?? null) : null, // လက်ရှိ user (မဝင်ထားရင် null)
      isLoading: !!token && me.isPending, 
      isAdmin: me.data?.role === 'ADMIN',
      signedOut,
      login: (email, password) =>
        api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { email, password } }).then(startSession),
      register: (name, email, password) =>
        api<{ token: string; user: User }>('/auth/register', { method: 'POST', body: { name, email, password } }).then(startSession),
      logout,
      setUser: (user) => queryClient.setQueryData(['me', token], user), // profile ပြင်ပြီးရင် cache update
    }),
    [token, me.data, me.isPending, signedOut, startSession, logout, queryClient],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
