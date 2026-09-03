import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useCurrentUser } from '../../features/auth/queries'
import { SessionBootstrapError, SessionBootstrapLoading } from './SessionState'

export function ProtectedRoute() {
  const location = useLocation()
  const currentUser = useCurrentUser()

  if (currentUser.isPending) return <SessionBootstrapLoading />
  if (currentUser.isError) {
    return <SessionBootstrapError onRetry={() => void currentUser.refetch()} />
  }
  if (currentUser.isUnauthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <Outlet />
}
