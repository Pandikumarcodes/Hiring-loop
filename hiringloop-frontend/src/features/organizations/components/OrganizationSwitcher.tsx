import { Link, useLocation, useNavigate } from 'react-router-dom'

import { LoadingIndicator } from '../../../shared/components/feedback'
import { Select } from '../../../shared/components/ui'
import { useOrganization, useOrganizations } from '../hooks/queries'
import { isOrganizationId } from '../utils/organization-utils'

function routeOrganizationId(pathname: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean)
  const id =
    segments[0] === 'app' && segments[1] === 'organizations'
      ? segments[2]
      : undefined
  return isOrganizationId(id) ? id : undefined
}

export function OrganizationSwitcher() {
  const location = useLocation()
  const navigate = useNavigate()
  const organizations = useOrganizations()
  const currentId = routeOrganizationId(location.pathname)
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
    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:max-w-3xl">
      {organizations.data.length === 1 ? (
        <div className="flex min-w-0 max-w-[min(18rem,55vw)] flex-1 items-center gap-2">
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
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <label
            className="shrink-0 text-xs font-bold text-text-secondary"
            htmlFor="organization-switcher"
          >
            Workspace
          </label>
          <Select
            className="min-w-0 flex-1 lg:max-w-[31.25rem]"
            aria-label="Switch organization"
            id="organization-switcher"
            value={current ? current.id : ''}
            onChange={(event) => {
              if (event.target.value)
                navigate(`/app/organizations/${event.target.value}`)
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
        className="inline-flex min-h-11 shrink-0 items-center rounded-control border border-teal-200 bg-primary-soft px-3 text-xs font-bold text-primary-dark hover:bg-teal-100"
        to="/app/organizations/new"
      >
        <span aria-hidden="true">+</span> New workspace
      </Link>
    </div>
  )
}
