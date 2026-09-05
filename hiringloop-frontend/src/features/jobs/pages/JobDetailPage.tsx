import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/ui'
import { Button } from '../../../shared/components/ui'
import { ErrorState, LoadingState } from '../../../shared/components/feedback'
import { JobActions } from '../components/JobActions'
import { JobStatusBadge } from '../components/JobStatusBadge'
import { useTransitionJob } from '../hooks/mutations'
import { useJob } from '../hooks/queries'
import type { JobAction } from '../api/jobs.api'
import {
  employmentLabel,
  formatJobDate,
  jobError,
  workplaceLabel,
  can,
  jobTitle,
} from '../utils/job-utils'
import { ConfirmDialog } from '../../team/components/ConfirmDialog'
import { useOrganization } from '../../organizations/hooks/queries'
import { isApiError } from '../../../shared/lib/apiErrors'
export function JobDetailPage() {
  const { organizationId = '', jobId = '' } = useParams()
  const navigate = useNavigate()
  const organization = useOrganization(organizationId, Boolean(organizationId))
  const mayRead = can(organization.data?.permissions, 'job:read')
  const query = useJob(
    organizationId,
    jobId,
    Boolean(organizationId && jobId && mayRead),
  )
  const transition = useTransitionJob(organizationId, jobId)
  const [action, setAction] = useState<JobAction | null>(null)
  const conflict =
    isApiError(transition.error) &&
    transition.error.code === 'JOB_VERSION_CONFLICT'
  if (organization.isPending || query.isPending)
    return <LoadingState label="Loading job" />
  if (organization.isError || !mayRead)
    return (
      <Wrap>
        <ErrorState
          title="Jobs access unavailable"
          description="You do not have permission to view jobs in this workspace."
        />
      </Wrap>
    )
  if (query.isError)
    return (
      <Wrap>
        <ErrorState
          description={jobError(query.error, 'We could not load this job.')}
          onRetry={() => void query.refetch()}
        />
      </Wrap>
    )
  const j = query.data
  return (
    <Wrap>
      <PageHeader
        title={jobTitle(j.title)}
        description={
          <span className="inline-flex items-center gap-2">
            <JobStatusBadge status={j.status} />
            <span>{j.department ?? 'No department'}</span>
          </span>
        }
        actions={
          <JobActions
            job={j}
            onEdit={() => navigate('edit')}
            onAction={setAction}
            permissions={organization.data.permissions}
          />
        }
      />
      {transition.isError ? (
        <div
          role="alert"
          className="mb-5 rounded-control border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {jobError(transition.error, 'We could not update this job.')}
          {conflict ? (
            <div className="mt-3">
              <Button
                variant="secondary"
                onClick={() => {
                  void query.refetch()
                  transition.reset()
                }}
              >
                Reload job
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-6">
          <Section title="Overview">
            <dl className="grid gap-5 sm:grid-cols-2">
              {[
                ['Department', j.department ?? 'Not set'],
                ['Employment type', employmentLabel(j.employmentType)],
                ['Workplace type', workplaceLabel(j.workplaceType)],
                ['Location', j.location ?? 'Not set'],
                ['Openings', String(j.openings)],
                ['Status', j.status[0] + j.status.slice(1).toLowerCase()],
              ].map(([k, v]) => (
                <Meta key={k} k={k} v={v} />
              ))}
            </dl>
          </Section>
          <Section title="Job description">
            <p className="whitespace-pre-wrap break-words leading-7 text-text-primary">
              {j.description ?? 'No description has been added.'}
            </p>
          </Section>
        </div>
        <Section title="Job details">
          <dl className="grid gap-5">
            <Meta k="Created" v={formatJobDate(j.createdAt)} />
            {j.openedAt ? (
              <Meta k="Opened" v={formatJobDate(j.openedAt)} />
            ) : null}
            {j.closedAt ? (
              <Meta k="Closed" v={formatJobDate(j.closedAt)} />
            ) : null}
            {j.archivedAt ? (
              <Meta k="Archived" v={formatJobDate(j.archivedAt)} />
            ) : null}
            <Meta k="Last updated" v={formatJobDate(j.updatedAt)} />
          </dl>
        </Section>
      </div>
      {action ? (
        <ConfirmDialog
          title={`${action[0].toUpperCase() + action.slice(1)} ${j.title}?`}
          description={
            action === 'archive'
              ? 'Archiving is terminal. This job will become view-only.'
              : `This will ${action} the job.`
          }
          confirmLabel={action[0].toUpperCase() + action.slice(1)}
          danger={action === 'archive'}
          busy={transition.isPending}
          onCancel={() => setAction(null)}
          onConfirm={() =>
            void transition
              .mutateAsync({ action, expectedVersion: j.version })
              .then(() => setAction(null))
              .catch(() => {})
          }
        />
      ) : null}
    </Wrap>
  )
}
const Wrap = ({ children }: { children: React.ReactNode }) => (
  <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
    {children}
  </section>
)
const Section = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <section className="rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6">
    <h2 className="mb-5 text-lg font-bold">{title}</h2>
    {children}
  </section>
)
const Meta = ({ k, v }: { k: string; v: string }) => (
  <div>
    <dt className="text-sm text-text-secondary">{k}</dt>
    <dd className="mt-1 font-semibold">{v}</dd>
  </div>
)
