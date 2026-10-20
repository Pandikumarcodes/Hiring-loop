import { Link, useLocation } from 'react-router-dom'

import { BrandMark } from '../features/auth/components/BrandMark'
import { OrganizationSwitcher } from '../features/organizations'
import type { OrganizationDto } from '../features/organizations/types/organization.types'
import { Avatar, AvatarFallback } from '../shared/components/ui'
import {
  isNavigationActive,
  navigationPath,
  visibleNavigationGroups,
  workspacePath,
} from './app-navigation'

interface AppSidebarProps {
  organizationId?: string
  organization?: OrganizationDto
  organizationPending: boolean
  organizationError: boolean
  email: string
  logoutPending: boolean
  onLogout: () => void
  onNavigate?: () => void
  mobile?: boolean
}

export function AppSidebar({
  organizationId,
  organization,
  organizationPending,
  organizationError,
  email,
  logoutPending,
  onLogout,
  onNavigate,
  mobile = false,
}: AppSidebarProps) {
  const location = useLocation()
  const home =
    organizationId && organization ? workspacePath(organizationId) : '/app'
  const initial = email[0]?.toUpperCase() ?? 'P'
  const groups =
    organizationId && organization
      ? visibleNavigationGroups(organization.permissions)
      : []

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="border-b border-border px-4 pb-4 pt-5">
        <Link
          className="inline-flex min-h-11 items-center text-primary-dark"
          to={home}
          onClick={onNavigate}
          aria-label={mobile ? 'HiringLoop workspace home' : 'HiringLoop home'}
        >
          <BrandMark />
        </Link>
        <div className="mt-5 rounded-card border border-border bg-background p-3">
          <OrganizationSwitcher compact onNavigate={onNavigate} />
        </div>
      </div>

      <nav
        aria-label="Application shell navigation"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5"
      >
        {organizationId && organizationPending ? (
          <p role="status" className="px-3 text-sm text-text-secondary">
            Loading workspace navigation…
          </p>
        ) : organizationId && organizationError ? (
          <p className="px-3 text-sm text-text-secondary">
            Workspace navigation unavailable.
          </p>
        ) : !organizationId ? (
          <p className="px-3 text-sm text-text-secondary">
            Choose a workspace to see navigation.
          </p>
        ) : null}
        {organizationId && organization
          ? groups.map((group) => (
              <div key={group.label} className="mb-5 last:mb-0">
                <p className="px-3 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-text-secondary">
                  {group.label}
                </p>
                <div className="mt-2 grid gap-1">
                  {group.items.map((item) => {
                    const href = navigationPath(organizationId, item.segment)
                    const active = isNavigationActive(
                      location.pathname,
                      organizationId,
                      item,
                    )
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.label}
                        to={href}
                        onClick={onNavigate}
                        data-active={active || undefined}
                        aria-current={
                          location.pathname === href ? 'page' : undefined
                        }
                        className={`flex min-h-11 min-w-0 items-center gap-3 rounded-control border border-transparent px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-primary-dark focus-visible:outline-offset-2 ${
                          active
                            ? 'border-teal-100 bg-primary-soft text-primary-dark'
                            : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
                        }`}
                      >
                        <Icon
                          className="h-4.5 w-4.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 truncate">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))
          : null}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar>
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" title={email}>
              {email}
            </p>
            <p className="text-xs text-text-secondary">Signed in account</p>
          </div>
        </div>
        <button
          type="button"
          className="mt-3 inline-flex min-h-11 w-full items-center rounded-control px-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-3 focus-visible:outline-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          disabled={logoutPending}
          onClick={onLogout}
        >
          {logoutPending ? 'Signing out…' : 'Sign out of HiringLoop'}
        </button>
      </div>
    </div>
  )
}
