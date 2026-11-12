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
    staleTime: 5 * 60_000,
    retry: false,
  })

  // True after the user logs out themselves (vs. an expired session), so
  // protected pages send them home instead of to the login form.
  const [signedOut, setSignedOut] = useState(false)

  const endSession = useCallback(() => {
    tokenStore.set(null)
    setToken(null)
    forgetSavedAddress()
    // Drop every cached private resource (cart, orders, wishlist, admin data).
    queryClient.removeQueries({ predicate: (q) => !['products', 'product', 'facets', 'reviews'].includes(String(q.queryKey[0])) })
  }, [queryClient])

  const logout = useCallback(() => {
    setSignedOut(true)
    endSession()
  }, [endSession])

  useEffect(() => setUnauthorizedHandler(endSession), [endSession])

  const startSession = useCallback(
    async ({ token: newToken, user }: { token: string; user: User }) => {
      tokenStore.set(newToken)
      setSignedOut(false)
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
          guestCart.clear()
        } catch {
          /* keep the guest cart so nothing is lost; the user can retry */
        }
      }
      return user
    },
    [queryClient],
  )

  const value = useMemo<AuthState>(
    () => ({
      user: token ? (me.data ?? null) : null,
      isLoading: !!token && me.isPending,
      isAdmin: me.data?.role === 'ADMIN',
      signedOut,
      login: (email, password) =>
        api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { email, password } }).then(startSession),
      register: (name, email, password) =>
        api<{ token: string; user: User }>('/auth/register', { method: 'POST', body: { name, email, password } }).then(startSession),
      logout,
      setUser: (user) => queryClient.setQueryData(['me', token], user),
    }),
    [token, me.data, me.isPending, signedOut, startSession, logout, queryClient],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
