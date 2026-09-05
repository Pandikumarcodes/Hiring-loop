import { Link, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'

import { LoadingState } from '../../../shared/components/feedback'
import { PageHeader } from '../../../shared/components/ui'
import { useOrganization, useOrganizations } from '../hooks/queries'
import { isOrganizationId } from '../utils/organization-utils'
import { JobsNavigationLink } from '../../jobs'

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
    <section className="mx-auto w-full max-w-6xl min-w-0 px-4 py-10 sm:px-8 lg:px-12 lg:py-14">
      <p className="eyebrow">Workspace</p>
      <PageHeader
        title={organization.data.name}
        description="Your HiringLoop workspace is ready."
      />
      <div className="mt-8 w-full max-w-2xl rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6">
        <p className="organization-workspace__card-eyebrow">Getting started</p>
        <h2 className="text-xl font-bold">Everything starts here</h2>
        <p className="mt-3 leading-6 text-text-secondary">
          Your team-management and recruiting workflows will appear here as your
          workspace grows.
        </p>
        <Link
          className="mt-2 inline-block font-bold text-primary-dark hover:underline"
          to="team"
        >
          Team
        </Link>
        <JobsNavigationLink permissions={organization.data.permissions} />
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
      className="mx-4 my-10 w-auto max-w-2xl rounded-card border border-border bg-surface p-5 shadow-sm sm:mx-auto sm:my-16 sm:p-8"
      aria-labelledby="organization-unavailable-title"
    >
      <p className="eyebrow">Workspace</p>
      <h1
        className="text-3xl font-bold tracking-tight"
        id="organization-unavailable-title"
      >
        Organization unavailable
      </h1>
      <p className="mt-3 max-w-xl leading-6 text-text-secondary">
        You don&apos;t have access to this organization, or it may no longer be
        available.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:rounded-control [&_a]:bg-primary [&_a]:px-4 [&_a]:py-2.5 [&_a]:font-bold [&_a]:text-white [&_a]:no-underline [&_a]:hover:bg-primary-dark [&_button]:min-h-11 [&_button]:rounded-control [&_button]:border [&_button]:border-border [&_button]:bg-surface [&_button]:px-4 [&_button]:py-2.5 [&_button]:font-bold [&_button]:text-primary-dark">
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
