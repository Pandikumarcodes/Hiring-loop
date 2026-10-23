import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  BriefcaseBusiness,
  CalendarDays,
  CircleCheck,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

import { Badge, Card, PageHeader } from '../../../shared/components/ui'
import { isApiError } from '../../../shared/lib/apiErrors'
import {
  useAnalyticsOverview,
  useAnalyticsPipeline,
} from '../../analytics/hooks/queries'
import type { AnalyticsFilters } from '../../analytics/types/analytics.types'
import {
  calendarEndUtc,
  calendarStartUtc,
  dateDaysAgo,
  localDateString,
} from '../../analytics/utils/analytics-utils'
import { useCandidates } from '../../candidate-management/hooks/queries'
import type { CandidateListFilters } from '../../candidate-management/types/candidate-management.types'
import { useCalendarInterviews } from '../../interviews/hooks/queries'
import { interviewTime } from '../../interviews/utils/interview-utils'
import { JobStatusBadge } from '../../jobs/components/JobStatusBadge'
import { useJobs } from '../../jobs/hooks/queries'
import type { JobFilters } from '../../jobs/types/job.types'
import { jobRoutes } from '../../jobs/utils/job-routes'
import type {
  OrganizationDto,
  OrganizationPermission,
} from '../types/organization.types'

const recentJobFilters: JobFilters = {
  page: 1,
  limit: 5,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
}
const openJobFilters: JobFilters = {
  ...recentJobFilters,
  limit: 1,
  status: 'OPEN',
}
const candidateFilters: CandidateListFilters = {
  page: 1,
  pageSize: 1,
  sort: 'newestApplication',
}

const can = (
  permissions: readonly OrganizationPermission[] | undefined,
  permission: OrganizationPermission,
) => Boolean(permissions?.includes(permission))

export function WorkspaceDashboard({
  organization,
}: {
  organization: OrganizationDto
}) {
  const organizationId = organization.id
  const permissions = organization.permissions
  const mayListJobs = can(permissions, 'job:list')
  const mayListCandidates = can(permissions, 'candidate:list')
  const mayViewAnalytics = can(permissions, 'analytics:view')
  const mayViewInterviews = can(permissions, 'interview:view-assigned')
  const assignedOnly = !can(permissions, 'interview:view')
  const [now] = useState(() => new Date())
  const analyticsFilters: AnalyticsFilters = {
    from: calendarStartUtc(dateDaysAgo(29, now)),
    to: calendarEndUtc(localDateString(now)),
  }
  const interviewFrom = now.toISOString()
  const interviewTo = new Date(now.getTime() + 7 * 86400000).toISOString()

  const jobs = useJobs(organizationId, recentJobFilters, mayListJobs)
  const openJobs = useJobs(
    organizationId,
    openJobFilters,
    mayListJobs && !mayViewAnalytics,
  )
  const candidates = useCandidates(
    organizationId,
    candidateFilters,
    mayListCandidates,
  )
  const overview = useAnalyticsOverview(
    organizationId,
    analyticsFilters,
    mayViewAnalytics,
  )
  const pipeline = useAnalyticsPipeline(
    organizationId,
    analyticsFilters,
    mayViewAnalytics,
  )
  const interviews = useCalendarInterviews(
    organizationId,
    interviewFrom,
    interviewTo,
    assignedOnly,
    mayViewInterviews,
  )

  // List hooks retain previous data during key changes; do not render it in another tenant.
  const visibleJobs = jobs.isPlaceholderData ? undefined : jobs.data
  const visibleOpenJobs = openJobs.isPlaceholderData ? undefined : openJobs.data
  const visibleCandidates = candidates.isPlaceholderData
    ? undefined
    : candidates.data
  const visibleInterviews = interviews.isPlaceholderData
    ? undefined
    : interviews.data
  const upcoming = visibleInterviews
    ?.filter((interview) => interview.status === 'SCHEDULED')
    .sort((a, b) => a.scheduledStartAt.localeCompare(b.scheduledStartAt))
  const root = `/app/organizations/${organizationId}`
  const interviewLink = `${root}/interviews${assignedOnly ? '?mine=true' : ''}`

  return (
    <section className="mx-auto w-full max-w-7xl min-w-0 px-4 py-8 [overflow-wrap:anywhere] sm:px-6 lg:px-8 lg:py-10">
      <p className="eyebrow mb-2">{organization.name}</p>
      <PageHeader
        title="Dashboard"
        description="A clear view of your hiring work and what comes next."
        actions={
          can(permissions, 'job:create') ? (
            <Link
              className="inline-flex min-h-11 items-center rounded-control bg-primary-dark px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-3 focus-visible:outline-primary-dark"
              to={jobRoutes.create(organizationId)}
            >
              Create job
            </Link>
          ) : null
        }
      />

      <div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Recruiting summary"
      >
        {mayListJobs ? (
          <MetricCard
            label="Total jobs"
            icon={BriefcaseBusiness}
            value={visibleJobs?.pagination.totalItems}
            loading={jobs.isPending || jobs.isPlaceholderData}
            error={jobs.isError}
            onRetry={() => void jobs.refetch()}
            to={jobRoutes.list(organizationId)}
            hint="All job statuses"
          />
        ) : null}
        {mayViewAnalytics || mayListJobs ? (
          <MetricCard
            label="Open jobs"
            icon={CircleCheck}
            value={
              mayViewAnalytics
                ? overview.data?.openJobs
                : visibleOpenJobs?.pagination.totalItems
            }
            loading={
              mayViewAnalytics
                ? overview.isPending
                : openJobs.isPending || openJobs.isPlaceholderData
            }
            error={mayViewAnalytics ? overview.isError : openJobs.isError}
            onRetry={() =>
              void (mayViewAnalytics ? overview.refetch() : openJobs.refetch())
            }
            to={
              mayListJobs
                ? `${jobRoutes.list(organizationId)}?status=OPEN`
                : undefined
            }
            hint="Currently open roles"
          />
        ) : null}
        {mayListCandidates ? (
          <MetricCard
            label="Total candidates"
            icon={Users}
            value={visibleCandidates?.pagination.totalItems}
            loading={candidates.isPending || candidates.isPlaceholderData}
            error={candidates.isError}
            onRetry={() => void candidates.refetch()}
            to={`${root}/candidates`}
            hint="Across this workspace"
          />
        ) : null}
        {mayViewAnalytics ? (
          <MetricCard
            label="Active applications"
            icon={Workflow}
            value={overview.data?.activeApplications}
            loading={overview.isPending}
            error={overview.isError}
            onRetry={() => void overview.refetch()}
            to={`${root}/analytics`}
            hint="Current active applications"
          />
        ) : null}
        {mayViewInterviews ? (
          <MetricCard
            label={
              assignedOnly ? 'My upcoming interviews' : 'Upcoming interviews'
            }
            icon={CalendarDays}
            value={upcoming?.length}
            loading={interviews.isPending || interviews.isPlaceholderData}
            error={interviews.isError}
            onRetry={() => void interviews.refetch()}
            to={interviewLink}
            hint="Scheduled in the next 7 days"
          />
        ) : null}
      </div>

      <div className="mt-8 grid min-w-0 gap-6 xl:grid-cols-2">
        {mayListJobs ? (
          <Card className="p-5 sm:p-6">
            <SectionHeading
              title="Recent jobs"
              link={jobRoutes.list(organizationId)}
              linkLabel="View all jobs"
            />
            {jobs.isPending || jobs.isPlaceholderData ? (
              <WidgetLoading label="Loading recent jobs" />
            ) : jobs.isError ? (
              <WidgetError
                message={apiMessage(
                  jobs.error,
                  'We could not load recent jobs.',
                )}
                onRetry={() => void jobs.refetch()}
              />
            ) : visibleJobs?.jobs.length ? (
              <ul className="mt-4 divide-y divide-border">
                {visibleJobs.jobs.map((job) => (
                  <li
                    key={job.id}
                    className="flex min-w-0 flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <Link
                        className="break-words font-semibold text-primary-dark hover:underline"
                        to={jobRoutes.detail(organizationId, job.id)}
                      >
                        {job.title}
                      </Link>
                      <p className="mt-1 text-xs text-text-secondary">
                        {[job.department, job.location]
                          .filter(Boolean)
                          .join(' · ') || 'No department or location'}
                      </p>
                    </div>
                    <JobStatusBadge status={job.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-text-secondary">
                No jobs yet in this workspace.
              </p>
            )}
          </Card>
        ) : null}

        {mayViewInterviews ? (
          <Card className="p-5 sm:p-6">
            <SectionHeading
              title={
                assignedOnly ? 'My upcoming interviews' : 'Upcoming interviews'
              }
              link={interviewLink}
              linkLabel="View interviews"
            />
            <p className="mt-1 text-xs text-text-secondary">Next 7 days</p>
            {interviews.isPending || interviews.isPlaceholderData ? (
              <WidgetLoading label="Loading upcoming interviews" />
            ) : interviews.isError ? (
              <WidgetError
                message={apiMessage(
                  interviews.error,
                  'We could not load upcoming interviews.',
                )}
                onRetry={() => void interviews.refetch()}
              />
            ) : upcoming?.length ? (
              <ul className="mt-4 divide-y divide-border">
                {upcoming.slice(0, 5).map((interview) => (
                  <li key={interview.id} className="py-3 first:pt-0">
                    <Link
                      className="break-words font-semibold text-primary-dark hover:underline"
                      to={`${root}/interviews/${interview.id}`}
                    >
                      {interview.title}
                    </Link>
                    <p className="mt-1 break-words text-sm text-text-secondary">
                      {interview.application.candidate.name} ·{' '}
                      {interview.application.job.title}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {interviewTime(interview)}
                    </p>
                    <Badge variant="info" className="mt-2">
                      Scheduled
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-text-secondary">
                No scheduled interviews in the next 7 days.
              </p>
            )}
          </Card>
        ) : null}
      </div>

      {mayViewAnalytics ? (
        <Card className="mt-6 p-5 sm:p-6">
          <SectionHeading
            title="Recruitment pipeline"
            link={`${root}/analytics`}
            linkLabel="Explore analytics"
          />
          <p className="mt-1 text-xs text-text-secondary">
            Current applications by stage across this workspace
          </p>
          {pipeline.isPending ? (
            <WidgetLoading label="Loading pipeline" />
          ) : pipeline.isError ? (
            <WidgetError
              message={apiMessage(
                pipeline.error,
                'We could not load the pipeline.',
              )}
              onRetry={() => void pipeline.refetch()}
            />
          ) : pipeline.data?.currentStages.length ? (
            <ul
              className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              aria-label="Current pipeline stages"
            >
              {pipeline.data.currentStages.map((stage) => (
                <li
                  key={stage.id}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-control border border-border bg-surface-muted px-4 py-3"
                >
                  <span className="min-w-0 break-words text-sm text-text-secondary">
                    {stage.name}
                  </span>
                  <strong className="text-lg tabular-nums text-text-primary">
                    {stage.count.toLocaleString()}
                  </strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-text-secondary">
              No pipeline stages yet.
            </p>
          )}
        </Card>
      ) : null}

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-text-primary">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {can(permissions, 'job:create') ? (
            <QuickLink to={jobRoutes.create(organizationId)}>
              Create job
            </QuickLink>
          ) : null}
          {mayListCandidates ? (
            <QuickLink to={`${root}/candidates`}>View candidates</QuickLink>
          ) : null}
          {mayViewInterviews ? (
            <QuickLink to={interviewLink}>View interviews</QuickLink>
          ) : null}
          {mayViewAnalytics ? (
            <QuickLink to={`${root}/analytics`}>Open analytics</QuickLink>
          ) : null}
          {can(permissions, 'member:role-change') ? (
            <QuickLink to={`${root}/team`}>Manage team</QuickLink>
          ) : null}
          {!can(permissions, 'job:create') &&
          !mayListCandidates &&
          !mayViewInterviews &&
          !mayViewAnalytics &&
          !can(permissions, 'member:role-change') ? (
            <p className="text-sm text-text-secondary">
              No quick actions are available for your role.
            </p>
          ) : null}
        </div>
      </Card>
    </section>
  )
}

function MetricCard({
  label,
  icon: Icon,
  value,
  loading,
  error,
  onRetry,
  to,
  hint,
}: {
  label: string
  icon: LucideIcon
  value: number | undefined
  loading: boolean
  error: boolean
  onRetry: () => void
  to?: string
  hint: string
}) {
  return (
    <Card className="flex h-full flex-col p-4 sm:p-5">
      <div className="flex min-h-10 items-start justify-between gap-2">
        <p className="text-sm font-semibold text-text-secondary">{label}</p>
        <Icon
          className="h-5 w-5 shrink-0 text-primary-dark"
          aria-hidden="true"
        />
      </div>
      {loading ? (
        <p role="status" className="mt-3 min-h-9 text-sm text-text-secondary">
          Loading {label.toLowerCase()}…
        </p>
      ) : error || value === undefined ? (
        <div className="mt-4" role="alert">
          <p className="text-sm text-error">Unavailable</p>
          <button
            className="mt-2 min-h-11 text-sm font-semibold text-primary-dark hover:underline focus-visible:outline-3 focus-visible:outline-primary-dark"
            onClick={onRetry}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : (
        <p className="mt-3 text-3xl font-bold tabular-nums text-text-primary">
          {value.toLocaleString()}
        </p>
      )}
      <p className="mt-2 mb-3 text-xs text-text-secondary">{hint}</p>
      {to ? (
        <Link
          className="mt-auto inline-flex min-h-11 items-center text-sm font-semibold text-primary-dark hover:underline focus-visible:outline-3 focus-visible:outline-primary-dark"
          to={to}
        >
          View {label.toLowerCase()}
        </Link>
      ) : null}
    </Card>
  )
}

function SectionHeading({
  title,
  link,
  linkLabel,
}: {
  title: string
  link: string
  linkLabel: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-bold text-text-primary">{title}</h2>
      <Link
        className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-dark hover:underline focus-visible:outline-3 focus-visible:outline-primary-dark"
        to={link}
      >
        {linkLabel}
      </Link>
    </div>
  )
}

function WidgetLoading({ label }: { label: string }) {
  return (
    <p role="status" className="mt-4 text-sm text-text-secondary">
      {label}…
    </p>
  )
}

function WidgetError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div role="alert" className="mt-4 text-sm text-error">
      <p>{message}</p>
      <button
        type="button"
        className="mt-2 min-h-11 font-semibold text-primary-dark hover:underline focus-visible:outline-3 focus-visible:outline-primary-dark"
        onClick={onRetry}
      >
        Try again
      </button>
    </div>
  )
}

function QuickLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      className="inline-flex min-h-11 items-center rounded-control border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-primary-dark hover:bg-primary-soft focus-visible:outline-3 focus-visible:outline-primary-dark"
      to={to}
    >
      {children}
    </Link>
  )
}

function apiMessage(error: unknown, fallback: string) {
  return isApiError(error) && error.status === 403
    ? 'Access to this information is unavailable. Your permissions may have changed.'
    : fallback
}
