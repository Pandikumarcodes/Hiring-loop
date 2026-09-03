import { Navigate, Outlet } from 'react-router-dom'

import { useCurrentUser } from '../../features/auth/queries'
import { SessionBootstrapError, SessionBootstrapLoading } from './SessionState'

export function PublicRoute() {
  const currentUser = useCurrentUser()

  if (currentUser.isPending) return <SessionBootstrapLoading />
  if (currentUser.isError) {
    return <SessionBootstrapError onRetry={() => void currentUser.refetch()} />
  }
  if (currentUser.isAuthenticated) return <Navigate replace to="/app" />

  return <Outlet />
}
