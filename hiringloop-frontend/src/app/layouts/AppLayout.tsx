import { Link, Outlet, useNavigate } from 'react-router-dom'

import { useLogout } from '../../features/auth/mutations'
import { genericMutationError } from '../../features/auth/ui-utils'
import { AuthAlert } from '../../features/auth/components'

export function AppLayout() {
  const navigate = useNavigate()
  const logout = useLogout()

  async function handleLogout() {
    if (logout.isPending) return
    try {
      await logout.mutateAsync()
      navigate('/login', { replace: true })
    } catch {
      // The shell stays available so the user can retry a recoverable failure.
    }
  }

  return (
    <div className="app-frame">
      <header className="app-header">
        <Link className="brand" to="/">
          HiringLoop
        </Link>
        <nav aria-label="Application shell navigation">
          <Link to="/">Return home</Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={logout.isPending}
          >
            {logout.isPending ? 'Signing out…' : 'Sign out'}
          </button>
        </nav>
      </header>
      {logout.isError ? (
        <AuthAlert>
          {genericMutationError(logout.error)} Please try signing out again.
        </AuthAlert>
      ) : null}
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
