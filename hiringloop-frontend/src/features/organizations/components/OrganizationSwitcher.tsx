import { useId } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { LoadingIndicator } from '../../../shared/components/feedback'
import { Select } from '../../../shared/components/ui'
import { useOrganization, useOrganizations } from '../hooks/queries'
import { organizationIdFromPath } from '../utils/organization-utils'

export function OrganizationSwitcher({
  compact = false,
  onNavigate,
}: {
  compact?: boolean
  onNavigate?: () => void
}) {
  const selectId = useId()
  const location = useLocation()
  const navigate = useNavigate()
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
    <div
      className={
        compact
          ? 'flex min-w-0 flex-col items-stretch gap-2'
          : 'flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:max-w-3xl'
      }
    >
      {organizations.data.length === 1 ? (
        <div
          className={
            compact
              ? 'flex min-w-0 flex-col gap-1'
              : 'flex min-w-0 max-w-[min(18rem,55vw)] flex-1 items-center gap-2'
          }
        >
          <span className="shrink-0 text-xs font-bold text-text-secondary">
            Workspace
          </span>
          <span
            className="min-w-0 truncate text-sm"
            title={current?.name ?? 'Organization unavailable'}
          >
            {current?.name ?? 'Organization unavailable'}
          </span>
        </div>
      ) : (
        <div
          className={
            compact
              ? 'flex min-w-0 flex-col items-stretch gap-1'
              : 'flex min-w-0 flex-1 items-center gap-2'
          }
        >
          <label
            className="shrink-0 text-xs font-bold text-text-secondary"
            htmlFor={selectId}
          >
            Workspace
          </label>
          <Select
            className="min-w-0 flex-1 lg:max-w-[31.25rem]"
            aria-label="Switch organization"
            id={selectId}
            value={current ? current.id : ''}
            onChange={(event) => {
              if (event.target.value) {
                navigate(`/app/organizations/${event.target.value}`)
                onNavigate?.()
              }
            }}
          >
            {!current ? <option value="">Choose a workspace</option> : null}
            {organizations.data.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      <Link
        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-control border border-teal-200 bg-primary-soft px-3 text-xs font-bold text-primary-dark hover:bg-teal-100 ${compact ? 'w-full' : ''}`}
        to="/app/organizations/new"
        onClick={onNavigate}
      >
        <span aria-hidden="true">+</span> New workspace
      </Link>
    </div>
  )
}
