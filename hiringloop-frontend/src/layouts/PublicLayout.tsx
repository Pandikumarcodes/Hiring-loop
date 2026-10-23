import { Link, Outlet } from 'react-router-dom'
import { useCurrentUser } from '../features/auth/hooks/queries'

export function PublicLayout() {
  const currentUser = useCurrentUser()
  return (
    <div className="site-frame">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header flex-wrap gap-4">
        <Link className="brand" to="/" aria-label="HiringLoop home">
          HiringLoop
        </Link>
        <nav aria-label="Public navigation">
          <Link to="/">Home</Link>
          {currentUser.isUnauthenticated ? (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register">Register</Link>
            </>
          ) : (
            <Link to="/app">
              {currentUser.isAuthenticated ? 'Workspace' : 'Continue'}
            </Link>
          )}
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        HiringLoop · Applicant tracking system
      </footer>
    </div>
  )
}
