import { Link, useParams } from 'react-router-dom'
import {
  ErrorState,
  EmptyState,
  LoadingState,
} from '../../../shared/components/feedback'
import { Badge, PageHeader } from '../../../shared/components/ui'
import { isApiError } from '../../../shared/lib/apiErrors'
import { useOrganization } from '../../organizations/hooks/queries'
import { useCandidate } from '../hooks/queries'
import { CandidateTalentPools } from '../../talent-pools'
import type { CandidateDetailDto } from '../types/candidate-management.types'
import {
  canReadCandidates,
  candidateError,
  formatCandidateDate,
} from '../utils/candidate-management-utils'

export function CandidateDetailPage() {
  const { organizationId = '', candidateId = '' } = useParams()
  const organization = useOrganization(organizationId, Boolean(organizationId))
  const mayRead = canReadCandidates(organization.data?.permissions)
  const candidate = useCandidate(
    organizationId,
    candidateId,
    Boolean(organizationId && candidateId && mayRead),
  )

  if (organization.isPending)
    return <LoadingState label="Checking candidate access" />
  if (organization.isError || !mayRead)
    return (
      <Wrap>
        <ErrorState
          title="Candidate access unavailable"
          description="You do not have permission to view candidates in this workspace."
        />
      </Wrap>
    )
  if (candidate.isPending) return <LoadingState label="Loading candidate" />
  if (candidate.isError) {
    const notFound =
      isApiError(candidate.error) && candidate.error.status === 404
    return (
      <Wrap>
        <ErrorState
          title={notFound ? 'Candidate not found' : undefined}
          description={candidateError(
            candidate.error,
            'We could not load this candidate.',
          )}
          onRetry={notFound ? undefined : () => void candidate.refetch()}
        />
      </Wrap>
    )
  }
  if (!candidate.data)
    return (
      <Wrap>
        <ErrorState
          title="Candidate not found"
          description="This candidate is no longer available."
        />
      </Wrap>
    )

  return (
    <CandidateContent
      candidate={candidate.data}
      organizationId={organizationId}
      permissions={organization.data?.permissions ?? []}
    />
  )
}

function CandidateContent({
  candidate,
  organizationId,
  permissions,
}: {
  candidate: CandidateDetailDto
  organizationId: string
  permissions: readonly string[]
}) {
  return (
    <Wrap>
      <PageHeader
        title={candidate.name}
        description="Candidate profile and submitted applications."
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
        <Section title="Profile">
          <dl className="grid gap-5 sm:grid-cols-2">
            <Meta label="Name" value={candidate.name} />
            <Meta label="Email" value={candidate.email} />
            <Meta label="Phone" value={candidate.phone ?? 'Not provided'} />
            <Meta
              label="Added"
              value={formatCandidateDate(candidate.createdAt)}
            />
          </dl>
        </Section>
        <Section title="Contact">
          <p className="break-words text-sm text-text-secondary">
            {candidate.email}
          </p>
          {candidate.phone ? (
            <p className="mt-2 break-words text-sm">{candidate.phone}</p>
          ) : null}
        </Section>
      </div>
      <CandidateTalentPools
        organizationId={organizationId}
        candidateId={candidate.id}
        permissions={permissions}
      />
      <section
        className="mt-6 overflow-hidden rounded-card border border-border bg-surface shadow-sm"
        aria-labelledby="candidate-applications-title"
      >
        <h2
          id="candidate-applications-title"
          className="border-b border-border px-5 py-4 text-lg font-bold sm:px-6"
        >
          Applications
        </h2>
        {candidate.applications.length ? (
          <div className="divide-y divide-border">
            {candidate.applications.map((application) => (
              <article
                key={application.id}
                className="grid gap-3 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
              >
                <div className="min-w-0">
                  <Link
                    className="block truncate font-bold text-primary-dark hover:underline"
                    to={`/app/organizations/${organizationId}/applications/${application.id}`}
                    title={application.job.title}
                  >
                    {application.job.title}
                  </Link>
                  <p className="mt-1 text-sm text-text-secondary">
                    Submitted {formatCandidateDate(application.submittedAt)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <Badge variant="success">
                    {application.currentStage?.name ?? 'Stage unavailable'}
                  </Badge>
                  <Link
                    className="font-bold text-primary-dark hover:underline"
                    to={`/app/organizations/${organizationId}/applications/${application.id}`}
                  >
                    View application
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No applications"
            description="This candidate has no submitted applications."
          />
        )}
      </section>
    </Wrap>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="mb-5 text-lg font-bold">{title}</h2>
      {children}
    </section>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-6xl min-w-0 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {children}
    </section>
  )
}
