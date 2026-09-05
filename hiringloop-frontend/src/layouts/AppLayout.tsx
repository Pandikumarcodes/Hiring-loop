import { Link, Outlet, useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { AuthAlert } from '../features/auth/components'
import { useLogout } from '../features/auth/hooks/mutations'
import { useCurrentUser } from '../features/auth/hooks/queries'
import { genericMutationError } from '../features/auth/utils/ui-utils'
import { OrganizationSwitcher } from '../features/organizations'
import { BrandMark } from '../features/auth/components/BrandMark'
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../shared/components/ui'

export function AppLayout() {
  const navigate = useNavigate()
  const logout = useLogout()
  const currentUser = useCurrentUser()
  const email = currentUser.user?.email ?? 'Account'
  const initial = email[0]?.toUpperCase() ?? 'P'
  async function handleLogout() {
    if (logout.isPending) return
    try {
      await logout.mutateAsync()
      navigate('/login', { replace: true })
    } catch {
      /* shown in shell */
    }
  }
  return (
    <div className="app-frame min-h-dvh bg-background">
      <header className="border-b border-border bg-surface shadow-sm">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-6 lg:px-8">
          <Link
            className="inline-flex shrink-0 items-center text-primary-dark"
            to="/"
            aria-label="HiringLoop home"
          >
            <BrandMark className="app-brand" />
          </Link>
          <nav
            aria-label="Application shell navigation"
            className="col-span-2 row-start-2 flex min-w-0 items-center gap-2 lg:col-start-2 lg:col-span-1 lg:row-start-1 lg:justify-end lg:gap-4"
          >
            <OrganizationSwitcher />
          </nav>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-control p-1 text-text-primary hover:bg-primary-soft focus-visible:outline-3 focus-visible:outline-primary-dark focus-visible:outline-offset-2"
                aria-label={`Open account menu for ${email}`}
              >
                <Avatar>
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <ChevronDown
                  className="h-4 w-4 text-text-secondary"
                  aria-hidden="true"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" aria-label="Account menu">
              <div className="flex min-w-0 items-center gap-3 px-3 py-3">
                <Avatar>
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <strong className="block truncate text-sm" title={email}>
                    {email}
                  </strong>
                  <span className="text-xs text-text-secondary">
                    Signed in account
                  </span>
                </div>
              </div>
              <DropdownMenuSeparator className="my-1 bg-border" />
              <DropdownMenuItem
                disabled={logout.isPending}
                onSelect={() => void handleLogout()}
              >
                {logout.isPending ? 'Signing out…' : 'Sign out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      {logout.isError ? (
        <AuthAlert>
          {genericMutationError(logout.error)} Please try signing out again.
        </AuthAlert>
      ) : null}
      <main id="main-content" tabIndex={-1} className="min-w-0 outline-none">
        <Outlet />
      </main>
    </div>
  )
}
