import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { LoadingIndicator } from '../../../shared/components/feedback'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../shared/components/ui'
import { useOrganization, useOrganizations } from '../hooks/queries'
import { organizationIdFromPath } from '../utils/organization-utils'

export function OrganizationSwitcher({
  compact = false,
  onNavigate,
}: {
  compact?: boolean
  onNavigate?: () => void
}) {
  const location = useLocation()
  const organizations = useOrganizations()
  const currentId = organizationIdFromPath(location.pathname)
  const currentOrganization = useOrganization(
    currentId ?? '',
    Boolean(currentId),
  )
  if (organizations.isPending)
    return <LoadingIndicator label="Loading organizations" />
  if (organizations.isError || !organizations.data?.length) return null
  const current = currentId
    ? currentOrganization.isSuccess
      ? currentOrganization.data
      : undefined
    : organizations.data[0]
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Switch workspace: ${current?.name ?? 'Choose a workspace'}`}
          className={`flex min-h-12 min-w-0 items-center gap-3 rounded-control px-2 py-2 text-left transition-colors hover:bg-surface-muted focus-visible:outline-3 focus-visible:outline-primary-dark focus-visible:outline-offset-2 ${compact ? 'w-full' : 'w-full max-w-xs'}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-border bg-background text-primary-dark">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.65rem] font-semibold uppercase tracking-wider text-text-secondary">
              Workspace
            </span>
            <span className="block truncate text-sm font-semibold">
              {current?.name ?? 'Choose a workspace'}
            </span>
          </span>
          <ChevronsUpDown
            className="h-4 w-4 shrink-0 text-text-secondary"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        aria-label="Workspaces"
        aria-labelledby={undefined}
        className="w-72"
      >
        <p className="px-3 py-2 text-xs font-semibold text-text-secondary">
          Switch workspace
        </p>
        {organizations.data.map((organization) => (
          <DropdownMenuItem key={organization.id} asChild>
            <Link
              to={`/app/organizations/${organization.id}`}
              onClick={onNavigate}
              aria-current={
                current?.id === organization.id ? 'true' : undefined
              }
              className="gap-3"
            >
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                {organization.name}
              </span>
              {current?.id === organization.id ? (
                <>
                  <Check
                    className="h-4 w-4 shrink-0 text-primary-dark"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Current workspace</span>
                </>
              ) : null}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-1 h-px bg-border" />
        <DropdownMenuItem asChild>
          <Link
            to="/app/organizations/new"
            onClick={onNavigate}
            className="gap-3 font-semibold text-primary-dark"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            Create workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
