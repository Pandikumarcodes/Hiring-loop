import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'

import { AuthAlert } from '../features/auth/components'
import { useLogout } from '../features/auth/hooks/mutations'
import { useCurrentUser } from '../features/auth/hooks/queries'
import { genericMutationError } from '../features/auth/utils/ui-utils'
import { OrganizationSwitcher } from '../features/organizations'

export function AppLayout() {
  const navigate = useNavigate()
  const logout = useLogout()
  const currentUser = useCurrentUser()
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const accountTriggerRef = useRef<HTMLButtonElement>(null)
  const email = currentUser.user?.email ?? 'Account'
  const initial = email[0]?.toUpperCase() ?? 'P'

  useEffect(() => {
    if (!accountOpen) return
    function closeOnOutside(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node))
        setAccountOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountOpen(false)
        accountTriggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [accountOpen])

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
        <div className="app-header__inner">
          <Link className="brand" to="/">
            HiringLoop
          </Link>
          <nav
            className="app-header__controls"
            aria-label="Application shell navigation"
          >
            <OrganizationSwitcher />
            <div className="account-menu" ref={accountRef}>
              <button
                className="account-menu__trigger"
                ref={accountTriggerRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-label={`Open account menu for ${email}`}
                onClick={() => setAccountOpen((open) => !open)}
              >
                <span className="account-menu__avatar" aria-hidden="true">
                  {initial}
                </span>
                <span className="account-menu__name">{email}</span>
                <span className="account-menu__chevron" aria-hidden="true">
                  ⌄
                </span>
              </button>
              {accountOpen ? (
                <div
                  className="account-menu__panel"
                  role="menu"
                  aria-label="Account menu"
                >
                  <div className="account-menu__panel-identity">
                    <strong>{email}</strong>
                    <span>Signed in account</span>
                  </div>
                  <button
                    className="account-menu__item"
                    role="menuitem"
                    type="button"
                    disabled={logout.isPending}
                    onClick={() => void handleLogout()}
                  >
                    {logout.isPending ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              ) : null}
            </div>
          </nav>
        </div>
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
