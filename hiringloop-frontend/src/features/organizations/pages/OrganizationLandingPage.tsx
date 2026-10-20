import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ErrorState, LoadingState } from '../../../shared/components/feedback'
import {
  Button,
  PageContainer,
  PageHeader,
} from '../../../shared/components/ui'
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
    <PageContainer width="standard">
      <PageHeader
        title="Choose an organization"
        description="Select a workspace to continue."
      />
      <div className="my-6 grid gap-3">
        {organizations.data.map((organization) => (
          <Link
            className="flex min-h-13 min-w-0 items-center justify-between gap-3 rounded-control border border-border bg-surface p-4 text-text-primary no-underline shadow-sm hover:border-primary hover:bg-primary-soft"
            key={organization.id}
            to={`/app/organizations/${organization.id}`}
          >
            <span className="min-w-0 break-words">{organization.name}</span>
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
    </PageContainer>
  )
}
