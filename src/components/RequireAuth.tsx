import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/context'
import { Spinner } from './ui'

export function RequireAuth({ children, role }: { children: ReactNode; role?: 'ADMIN' }) {
  const { user, isLoading, signedOut } = useAuth()
  const location = useLocation()
  if (isLoading) return <Spinner />
  if (!user && signedOut) return <Navigate to="/" replace />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return <>{children}</>
}
