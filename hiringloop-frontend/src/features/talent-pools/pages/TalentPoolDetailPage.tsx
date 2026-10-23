import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Button,
  Input,
  PageContainer,
  PageHeader,
} from '../../../shared/components/ui'
import {
  ErrorState,
  LoadingState,
  EmptyState,
} from '../../../shared/components/feedback'
import { useOrganization } from '../../organizations/hooks/queries'
import { usePoolMembers, usePools } from '../hooks/queries'
import { useTalentPoolActions } from '../hooks/mutations'
import { PoolForm } from './TalentPoolsPage'
import { isApiError } from '../../../shared/lib/apiErrors'
export function TalentPoolDetailPage() {
  const { organizationId = '', talentPoolId = '' } = useParams()
  const org = useOrganization(organizationId, !!organizationId)
  const permissions = (org.data?.permissions ?? []) as readonly string[]
  const allowed = permissions.includes('talent-pool:view'),
    manage = permissions.includes('talent-pool:manage'),
    memberManage = permissions.includes('talent-pool-member:manage')
  const pools = usePools(organizationId, 1, '', allowed)
  const pool = pools.data?.pools.find((p) => p.id === talentPoolId)
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [edit, setEdit] = useState(false)
  const members = usePoolMembers(
    organizationId,
    talentPoolId,
    page,
    search,
    allowed,
  )
  const actions = useTalentPoolActions(organizationId)
  if (org.isPending || pools.isPending)
    return <LoadingState label="Loading talent pool" />
  if (org.isError) {
    const denied = isApiError(org.error) && org.error.status === 403
    return (
      <PageContainer width="standard">
        <ErrorState
          title={
            denied
              ? 'Talent pool access unavailable'
              : 'Talent pools unavailable'
          }
          description={
            denied
              ? 'You do not have permission to view talent pools in this workspace.'
              : 'We could not load this workspace. Please try again.'
          }
          onRetry={denied ? undefined : () => void org.refetch()}
        />
      </PageContainer>
    )
  }
  if (!allowed)
    return (
      <PageContainer width="standard">
        <ErrorState title="Talent pool access unavailable" />
      </PageContainer>
    )
  if (pools.isError)
    return (
      <PageContainer width="standard">
        <ErrorState
          title="Talent pool unavailable"
          description="We could not load this talent pool. Please try again."
          onRetry={() => void pools.refetch()}
        />
      </PageContainer>
    )
  if (!pool)
    return (
      <PageContainer width="standard">
        <ErrorState title="Talent pool not found" />
      </PageContainer>
    )
  return (
    <PageContainer width="standard">
      <PageHeader
        title={pool.name}
        description={pool.description ?? 'Talent pool members.'}
      />
      {manage ? (
        <div className="mt-3">
          <Button variant="secondary" onClick={() => setEdit(true)}>
            Edit pool
          </Button>
        </div>
      ) : null}
      <Input
        className="mt-6 max-w-md"
        aria-label="Search members"
        placeholder="Search members"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
      />
      {members.isPending ? (
        <LoadingState label="Loading members" />
      ) : members.isError ? (
        <ErrorState
          title="Members unavailable"
          onRetry={() => void members.refetch()}
        />
      ) : members.data?.members.length ? (
        <div className="mt-5 grid gap-3">
          {members.data.members.map((m) => (
            <article
              key={m.id}
              className="flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-card border border-border bg-surface p-4"
            >
              <div className="min-w-0 flex-1 basis-48 [overflow-wrap:anywhere]">
                <Link
                  className="font-bold text-primary-dark hover:underline"
                  to={`/app/organizations/${organizationId}/candidates/${m.candidate.id}`}
                >
                  {m.candidate.firstName} {m.candidate.lastName}
                </Link>
                <p className="text-sm text-text-secondary">
                  {m.candidate.email}
                  {m.sourceApplicationId ? ' · Added from application' : ''}
                </p>
              </div>
              {memberManage ? (
                <Button
                  variant="danger"
                  loading={actions.remove.isPending}
                  onClick={() =>
                    actions.remove.mutate({
                      poolId: talentPoolId,
                      candidateId: m.candidate.id,
                    })
                  }
                >
                  Remove
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="No members"
            description="Add candidates from their candidate profile."
          />
        </div>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={(members.data?.members.length ?? 0) < 25}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
      {edit ? (
        <PoolForm
          organizationId={organizationId}
          pool={pool}
          onClose={() => setEdit(false)}
        />
      ) : null}
    </PageContainer>
  )
}
