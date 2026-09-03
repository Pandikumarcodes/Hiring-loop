import { Link, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'

import { LoadingState } from '../../../shared/components/feedback'
import { PageHeader } from '../../../shared/components/ui'
import { useOrganization, useOrganizations } from '../hooks/queries'
import { isOrganizationId } from '../utils/organization-utils'

export function OrganizationWorkspacePage() {
  const { organizationId } = useParams()
  const validId = isOrganizationId(organizationId)
  const organization = useOrganization(organizationId ?? '', validId)
  const organizations = useOrganizations()

  function unavailableAction() {
    if (organizations.data?.length === 0)
      return <Link to="/app/organizations/new">Go to organization setup</Link>
    if (organizations.data?.length === 1)
      return (
        <Link to={`/app/organizations/${organizations.data[0].id}`}>
          Go to my organization
        </Link>
      )
    return <Link to="/app">Choose another organization</Link>
  }

  if (!validId) return <UnavailableOrganization action={unavailableAction()} />
  if (organization.isPending)
    return <LoadingState label="Loading organization" />
  if (organization.isError)
    return (
      <UnavailableOrganization
        action={unavailableAction()}
        onRetry={() => void organization.refetch()}
      />
    )

  return (
    <section className="organization-workspace">
      <p className="eyebrow">Workspace</p>
      <PageHeader
        title={organization.data.name}
        description="Your HiringLoop workspace is ready."
      />
      <div className="organization-workspace__card">
        <p className="organization-workspace__card-eyebrow">Getting started</p>
        <h2>Everything starts here</h2>
        <p>
          Your team-management and recruiting workflows will appear here as your
          workspace grows.
        </p>
      </div>
    </section>
  )
}

function UnavailableOrganization({
  action,
  onRetry,
}: {
  action: ReactNode
  onRetry?: () => void
}) {
  return (
    <section
      className="organization-unavailable"
      aria-labelledby="organization-unavailable-title"
    >
      <p className="eyebrow">Workspace</p>
      <h1 id="organization-unavailable-title">Organization unavailable</h1>
      <p>
        You don&apos;t have access to this organization, or it may no longer be
        available.
      </p>
      <div className="organization-unavailable__actions">
        {action}
        {onRetry ? (
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        ) : null}
      </div>
    </section>
  )
}
