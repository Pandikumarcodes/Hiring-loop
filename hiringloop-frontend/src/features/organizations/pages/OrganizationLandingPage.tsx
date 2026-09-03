import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ErrorState, LoadingState } from '../../../shared/components/feedback'
import { Button } from '../../../shared/components/ui'
import { useOrganizations } from '../hooks/queries'

export function OrganizationLandingPage() {
  const navigate = useNavigate()
  const organizations = useOrganizations()

  useEffect(() => {
    if (organizations.data?.length === 1)
      navigate(`/app/organizations/${organizations.data[0].id}`, {
        replace: true,
      })
    if (organizations.data?.length === 0)
      navigate('/app/organizations/new', { replace: true })
  }, [navigate, organizations.data])

  if (organizations.isPending)
    return (
      <LoadingState
        label="Loading your organizations"
        description="Preparing your HiringLoop workspace."
      />
    )
  if (organizations.isError)
    return (
      <ErrorState
        title="Unable to load organizations"
        description="We couldn't load your organizations right now. Please try again."
        onRetry={() => void organizations.refetch()}
      />
    )
  if (!organizations.data?.length)
    return <LoadingState label="Opening organization setup" />
  return (
    <section className="organization-selection">
      <p className="eyebrow">Your workspaces</p>
      <h1>Choose an organization</h1>
      <p>Select a workspace to continue.</p>
      <div className="organization-selection__list">
        {organizations.data.map((organization) => (
          <Link
            className="organization-selection__item"
            key={organization.id}
            to={`/app/organizations/${organization.id}`}
          >
            <span>{organization.name}</span>
            <span aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
      <Button
        variant="secondary"
        onClick={() => navigate('/app/organizations/new')}
      >
        Create another organization
      </Button>
    </section>
  )
}
