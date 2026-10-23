import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, Menu } from 'lucide-react'

import { AuthAlert } from '../features/auth/components'
import { useLogout } from '../features/auth/hooks/mutations'
import { useCurrentUser } from '../features/auth/hooks/queries'
import { genericMutationError } from '../features/auth/utils/ui-utils'
import { useOrganization } from '../features/organizations/hooks/queries'
import { organizationIdFromPath } from '../features/organizations/utils/organization-utils'
import { NotificationBell } from '../features/notifications/components/NotificationBell'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../shared/components/ui'
import { AppSidebar } from './AppSidebar'
import { currentNavigationLabel, workspacePath } from './app-navigation'

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const organizationId = organizationIdFromPath(location.pathname)
  const organizationQuery = useOrganization(
    organizationId ?? '',
    Boolean(organizationId),
  )
  const organization =
    organizationId && organizationQuery.isSuccess
      ? organizationQuery.data
      : undefined
  const home =
    organizationId && organization ? workspacePath(organizationId) : '/app'
  const logout = useLogout()
  const currentUser = useCurrentUser()
  const email = currentUser.user?.email ?? 'Account'
  const section =
    organizationId && organization
      ? currentNavigationLabel(
          location.pathname,
          organizationId,
          organization.permissions,
        )
      : location.pathname === '/app/organizations/new'
        ? 'New workspace'
        : 'Workspaces'

  async function handleLogout() {
    if (logout.isPending) return
    try {
      await logout.mutateAsync()
      navigate('/login', { replace: true })
    } catch {
      // The shell displays the mutation error.
    }
  }

  const sidebarProps = {
    organizationId,
    organization,
    organizationPending: Boolean(organizationId && organizationQuery.isPending),
    organizationError: Boolean(organizationId && organizationQuery.isError),
    email,
    logoutPending: logout.isPending,
    onLogout: () => void handleLogout(),
  }

  return (
    <div className="app-frame min-h-dvh min-w-0 bg-background lg:pl-64">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside
        aria-label="Workspace sidebar"
        className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-surface lg:block"
      >
        <AppSidebar {...sidebarProps} />
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-surface/95 shadow-surface backdrop-blur-sm">
          <div className="flex min-h-16 min-w-0 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <MobileNavigation key={location.pathname} {...sidebarProps} />
            <div className="min-w-0 flex-1">
              {organization ? (
                <div className="flex min-w-0 items-center gap-1 text-sm">
                  <Link
                    className="min-w-0 truncate font-semibold text-text-secondary hover:text-primary-dark"
                    to={home}
                    title={organization.name}
                  >
                    {organization.name}
                  </Link>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-text-secondary"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 truncate font-semibold text-text-primary">
                    {section}
                  </span>
                </div>
              ) : (
                <span className="block truncate text-sm font-semibold text-text-primary">
                  {organizationId && organizationQuery.isPending
                    ? 'Loading workspace…'
                    : organizationId && organizationQuery.isError
                      ? 'Workspace unavailable'
                      : section}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <NotificationBell
                enabled={Boolean(
                  organization?.permissions?.includes('notification:view-own'),
                )}
              />
            </div>
          </div>
        </header>
        {logout.isError ? (
          <AuthAlert>
            {genericMutationError(logout.error)} Please try signing out again.
          </AuthAlert>
        ) : null}
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 outline-none"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function MobileNavigation(props: React.ComponentProps<typeof AppSidebar>) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-control text-text-primary hover:bg-primary-soft focus-visible:outline-3 focus-visible:outline-primary-dark lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent className="left-0 top-0 h-dvh max-h-dvh w-[min(18rem,calc(100vw-2rem))] max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-y-0 border-l-0 border-r border-border p-0 sm:w-64">
        <DialogTitle className="sr-only">Workspace navigation</DialogTitle>
        <DialogDescription className="sr-only">
          Choose a workspace or open a HiringLoop page.
        </DialogDescription>
        <AppSidebar {...props} mobile onNavigate={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
