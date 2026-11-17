import { createContext, useContext } from 'react'
import type { User } from '../lib/types'

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAdmin: boolean
  signedOut: boolean
  login: (email: string, password: string) => Promise<User>
  register: (name: string, email: string, password: string) => Promise<User>
  logout: () => void
  setUser: (user: User) => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
