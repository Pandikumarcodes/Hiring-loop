import { useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../shared/components/feedback'
import {
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  Select,
} from '../../../shared/components/ui'
import { useOrganization } from '../../organizations/hooks/queries'
import { useJobs } from '../../jobs/hooks/queries'
import type { JobFilters } from '../../jobs/types/job.types'
import {
  useAnalyticsCommunications,
  useAnalyticsFunnel,
  useAnalyticsInterviews,
  useAnalyticsJobs,
  useAnalyticsOutcomes,
  useAnalyticsOverview,
  useAnalyticsPipeline,
} from '../hooks/queries'
import type {
  AnalyticsFilters,
  AnalyticsOverview,
} from '../types/analytics.types'
import {
  calendarEndUtc,
  calendarDaySpan,
  calendarStartUtc,
  dateDaysAgo,
  formatDuration,
  formatPercent,
  localDateString,
} from '../utils/analytics-utils'
import { can } from '../../jobs/utils/job-utils'

const jobListFilters: JobFilters = {
  page: 1,
  limit: 100,
  sortBy: 'title',
  sortOrder: 'asc',
}

export function AnalyticsPage() {
  const { organizationId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const organization = useOrganization(organizationId, Boolean(organizationId))
  const fromDate = params.get('from') ?? dateDaysAgo(29)
  const toDate = params.get('to') ?? localDateString()
  const jobId = params.get('jobId') || undefined
  const validRange =
    isCalendarDate(fromDate) &&
    isCalendarDate(toDate) &&
    fromDate <= toDate &&
    calendarDaySpan(fromDate, toDate) <= 366
  const safeFromDate = isCalendarDate(fromDate) ? fromDate : dateDaysAgo(29)
  const safeToDate = isCalendarDate(toDate) ? toDate : localDateString()
  const filters = useMemo<AnalyticsFilters>(
    () => ({
      from: calendarStartUtc(safeFromDate),
      to: calendarEndUtc(safeToDate),
      ...(jobId ? { jobId } : {}),
    }),
    [safeFromDate, safeToDate, jobId],
  )
  const allowed = can(organization.data?.permissions, 'analytics:view')
  const jobs = useJobs(
    organizationId,
    jobListFilters,
    Boolean(
      organization.data && can(organization.data.permissions, 'job:list'),
    ),
  )
  const enabled = Boolean(organization.data && allowed && validRange)
  const overview = useAnalyticsOverview(organizationId, filters, enabled)
  const funnel = useAnalyticsFunnel(organizationId, filters, enabled)
  const pipeline = useAnalyticsPipeline(organizationId, filters, enabled)
  const interviews = useAnalyticsInterviews(organizationId, filters, enabled)
  const communications = useAnalyticsCommunications(
    organizationId,
    filters,
    enabled,
  )
  const outcomes = useAnalyticsOutcomes(organizationId, filters, enabled)
  const [jobPage] = useSearchPage(params)
  const comparison = useAnalyticsJobs(
    organizationId,
    filters,
    jobPage,
    10,
    enabled,
  )

  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  if (organization.isPending) return <LoadingState label="Loading analytics" />
  if (organization.isError || !allowed)
    return (
      <Page>
        <ErrorState
          title="Analytics access unavailable"
          description="You do not have permission to view analytics in this workspace."
        />
      </Page>
    )

  return (
    <Page>
      <PageHeader
        title="Analytics"
        description="Operational hiring metrics for the selected period."
      />
      <FilterBar
        from={fromDate}
        to={toDate}
        jobId={jobId ?? ''}
        jobs={jobs.data?.jobs ?? []}
        validRange={validRange}
        onChange={update}
      />
      {!validRange ? (
        <p
          className="mb-6 rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          Choose a valid date range with a start on or before the end date.
        </p>
      ) : null}
      <p className="mb-6 text-sm text-text-secondary">
        Showing {fromDate} through {toDate} (calendar dates, end date
        inclusive).
      </p>
      <OverviewSection query={overview} />
      <FunnelSection query={funnel} />
      <PipelineSection query={pipeline} />
      <InterviewsSection query={interviews} />
      <CommunicationsSection query={communications} />
      <OffersOutcomesSection overview={overview.data} outcomes={outcomes} />
      <JobComparison
        query={comparison}
        page={jobPage}
        pageSize={10}
        onPageChange={(value) => update('page', String(value))}
      />
    </Page>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-7xl min-w-0 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {children}
    </section>
  )
}

function FilterBar({
  from,
  to,
  jobId,
  jobs,
  validRange,
  onChange,
}: {
  from: string
  to: string
  jobId: string
  jobs: readonly { id: string; title: string }[]
  validRange: boolean
  onChange: (key: string, value: string) => void
}) {
  return (
    <div className="mb-3 grid gap-4 rounded-card border border-border bg-surface p-4 shadow-sm md:grid-cols-[repeat(2,minmax(10rem,1fr))_minmax(14rem,1.5fr)_auto]">
      <label className="grid gap-1 text-sm font-bold">
        <span>From</span>
        <Input
          type="date"
          value={from}
          onChange={(event) => onChange('from', event.target.value)}
          aria-label="Analytics start date"
        />
      </label>
      <label className="grid gap-1 text-sm font-bold">
        <span>To</span>
        <Input
          type="date"
          value={to}
          onChange={(event) => onChange('to', event.target.value)}
          aria-label="Analytics end date"
        />
      </label>
      <label className="grid gap-1 text-sm font-bold">
        <span>Job</span>
        <Select
          value={jobId}
          onChange={(event) => onChange('jobId', event.target.value)}
          aria-label="Analytics job"
        >
          <option value="">All jobs</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </Select>
      </label>
      <div className="flex items-end">
        <Badge variant={validRange ? 'neutral' : 'danger'}>
          {validRange ? 'Date range applied' : 'Invalid date range'}
        </Badge>
      </div>
    </div>
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
    <section
      className="mt-7 min-w-0"
      aria-labelledby={`${title.toLowerCase().replaceAll(' ', '-')}-heading`}
    >
      <h2
        id={`${title.toLowerCase().replaceAll(' ', '-')}-heading`}
        className="mb-3 text-xl font-bold"
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function QuerySection({
  loading,
  error,
  empty,
  retry,
  children,
}: {
  loading: boolean
  error: boolean
  empty: boolean
  retry: () => void
  children: React.ReactNode
}) {
  if (loading) return <LoadingState label="Loading analytics section" />
  if (error)
    return (
      <ErrorState
        description="We could not load this analytics section."
        onRetry={retry}
      />
    )
  if (empty)
    return (
      <EmptyState
        title="No data for this selection"
        description="Try another date range or job."
      />
    )
  return <>{children}</>
}

function OverviewSection({
  query,
}: {
  query: ReturnType<typeof useAnalyticsOverview>
}) {
  const data = query.data
  return (
    <Section title="Overview">
      <QuerySection
        loading={query.isPending}
        error={query.isError}
        empty={!data}
        retry={() => void query.refetch()}
      >
        {data ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Applications Received"
              value={data.applicationsReceived}
              hint="Selected period"
            />
            <Kpi
              label="Active Applications"
              value={data.activeApplications}
              hint="Current"
            />
            <Kpi label="Open Jobs" value={data.openJobs} hint="Current" />
            <Kpi
              label="Scheduled Interviews"
              value={data.scheduledInterviews}
              hint="Selected period"
            />
            <Kpi
              label="Offers Sent"
              value={data.offersSent}
              hint="Selected period"
            />
            <Kpi label="Hires" value={data.hires} hint="Selected period" />
            <Kpi
              label="Rejections"
              value={data.rejections}
              hint="Selected period"
            />
            <Kpi
              label="Average Time to Hire"
              value={formatDuration(data.averageTimeToHireSeconds)}
              hint={
                data.averageTimeToHireSeconds == null
                  ? 'No hires in selected period'
                  : 'Selected period'
              }
            />
          </div>
        ) : null}
      </QuerySection>
    </Section>
  )
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string
  value: React.ReactNode
  hint: string
}) {
  return (
    <Card className="p-4">
      <p className="text-sm text-text-secondary">{label}</p>
      <p
        className="mt-2 text-2xl font-bold"
        aria-label={`${label}: ${String(value)}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-text-secondary">{hint}</p>
    </Card>
  )
}

function FunnelSection({
  query,
}: {
  query: ReturnType<typeof useAnalyticsFunnel>
}) {
  const data = query.data
  const stages = data
    ? ([
        ['Applied', data.applied],
        ['Offer Sent', data.offerSent],
        ['Offer Accepted', data.offerAccepted],
        ['Hired', data.hired],
      ] as const)
    : []
  const max = Math.max(1, ...stages.map(([, count]) => count))
  return (
    <Section title="Hiring Funnel">
      <QuerySection
        loading={query.isPending}
        error={query.isError}
        empty={!data || stages.every(([, count]) => count === 0)}
        retry={() => void query.refetch()}
      >
        {data ? (
          <Card className="p-4">
            <ul className="grid gap-4">
              {stages.map(([label, count]) => (
                <li
                  key={label}
                  className="grid gap-1 sm:grid-cols-[12rem_minmax(0,1fr)_4rem] sm:items-center"
                >
                  <span className="font-semibold">{label}</span>
                  <span
                    className="h-4 overflow-hidden rounded-full bg-primary-soft"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(4, (count / max) * 100)}%` }}
                    />
                  </span>
                  <strong className="text-right">{count}</strong>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-text-secondary">
              Counts are shown as returned by the server; no client-side
              conversion rates are calculated.
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Scheduled interviews: {data.scheduledInterviewContext} (context
              only; not a funnel stage or completed-interview metric).
            </p>
          </Card>
        ) : null}
      </QuerySection>
    </Section>
  )
}

function PipelineSection({
  query,
}: {
  query: ReturnType<typeof useAnalyticsPipeline>
}) {
  const data = query.data
  return (
    <Section title="Pipeline">
      <QuerySection
        loading={query.isPending}
        error={query.isError}
        empty={!data || data.currentStages.length === 0}
        retry={() => void query.refetch()}
      >
        {data ? (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <caption className="sr-only">
                Current application distribution by pipeline stage
              </caption>
              <thead className="bg-slate-50 text-text-secondary">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Stage
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Current Applications
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Initial Entries
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.currentStages.map((stage) => (
                  <tr key={stage.id} className="border-t border-border">
                    <th scope="row" className="px-4 py-3 font-semibold">
                      {stage.name}
                    </th>
                    <td className="px-4 py-3">{stage.count}</td>
                    <td className="px-4 py-3">
                      {data.initialEntries.find(
                        (entry) => entry.stageId === stage.id,
                      )?.count ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : null}
      </QuerySection>
    </Section>
  )
}

function InterviewsSection({
  query,
}: {
  query: ReturnType<typeof useAnalyticsInterviews>
}) {
  const data = query.data
  return (
    <Section title="Interviews & Feedback">
      <QuerySection
        loading={query.isPending}
        error={query.isError}
        empty={!data}
        retry={() => void query.refetch()}
      >
        {data ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Scheduled Interviews"
              value={data.scheduled}
              hint="Scheduled records"
            />
            <Kpi
              label="Cancelled Interviews"
              value={data.cancelled}
              hint="Selected period"
            />
            <Kpi
              label="Upcoming Interviews"
              value={data.upcoming}
              hint="Current future schedule"
            />
            <Kpi
              label="Submitted Feedback"
              value={data.submittedFeedback}
              hint="Submitted feedback count"
            />
          </div>
        ) : null}
      </QuerySection>
    </Section>
  )
}

function CommunicationsSection({
  query,
}: {
  query: ReturnType<typeof useAnalyticsCommunications>
}) {
  const data = query.data
  return (
    <Section title="Communications">
      <QuerySection
        loading={query.isPending}
        error={query.isError}
        empty={!data}
        retry={() => void query.refetch()}
      >
        {data ? (
          <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi
              label="Attempted"
              value={data.attempted}
              hint="Selected period"
            />
            <Kpi
              label="PENDING"
              value={data.pending}
              hint="Separate from delivery"
            />
            <Kpi label="SENT" value={data.sent} hint="Completed delivery" />
            <Kpi label="FAILED" value={data.failed} hint="Completed delivery" />
            <Kpi
              label="Delivery Success Rate"
              value={formatPercent(data.completedDeliverySuccessRate)}
              hint={
                data.completedDeliverySuccessRate == null
                  ? 'Not enough completed delivery data'
                  : 'Server-provided rate'
              }
            />
          </Card>
        ) : null}
      </QuerySection>
    </Section>
  )
}

function OffersOutcomesSection({
  overview,
  outcomes,
}: {
  overview: AnalyticsOverview | undefined
  outcomes: ReturnType<typeof useAnalyticsOutcomes>
}) {
  const data = outcomes.data
  return (
    <Section title="Offers & Outcomes">
      <QuerySection
        loading={outcomes.isPending}
        error={outcomes.isError}
        empty={!data || !overview}
        retry={() => void outcomes.refetch()}
      >
        {data && overview ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="font-bold">Offers</h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Kpi
                  label="Sent"
                  value={overview.offersSent}
                  hint="Selected period"
                />
                <Kpi
                  label="Accepted"
                  value={data.offers.accepted}
                  hint="Returned offer status"
                />
                <Kpi
                  label="Declined"
                  value={data.offers.declined}
                  hint="Returned offer status"
                />
                <Kpi
                  label="Withdrawn"
                  value={data.offers.withdrawn}
                  hint="Returned offer status"
                />
                <Kpi
                  label="Awaiting Decision"
                  value={data.offers.awaitingDecision}
                  hint="Current SENT status"
                />
                <Kpi
                  label="Acceptance Rate"
                  value={formatPercent(data.offers.acceptanceRate)}
                  hint="Server-provided rate"
                />
                <Kpi
                  label="Decline Rate"
                  value={formatPercent(data.offers.declineRate)}
                  hint="Server-provided rate"
                />
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="font-bold">Outcomes</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Kpi label="Hired" value={data.hired} hint="Selected period" />
                <Kpi
                  label="Rejected"
                  value={data.rejected}
                  hint="Selected period"
                />
                <Kpi
                  label="Reopened"
                  value={data.reopened}
                  hint="Selected period"
                />
                <Kpi
                  label="Hire Rate"
                  value={formatPercent(data.hireRate)}
                  hint="Completed outcomes"
                />
                <Kpi
                  label="Rejection Rate"
                  value={formatPercent(data.rejectionRate)}
                  hint="Completed outcomes"
                />
                <Kpi
                  label="Average Time to Hire"
                  value={formatDuration(data.averageTimeToHireSeconds)}
                  hint={
                    data.averageTimeToHireSeconds == null
                      ? 'No hires in selected period'
                      : 'Selected period'
                  }
                />
              </div>
              <h3 className="mt-6 font-bold">Rejection reasons</h3>
              {data.rejectionReasons.length ? (
                <ul className="mt-2 grid gap-2 text-sm">
                  {data.rejectionReasons.map((reason) => (
                    <li
                      key={reason.code ?? 'unspecified'}
                      className="flex justify-between gap-3 border-b border-border py-2"
                    >
                      <span>
                        {reason.code
                          ? humanizeCode(reason.code)
                          : 'Unspecified'}
                      </span>
                      <strong>{reason.count}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-text-secondary">
                  No controlled rejection reasons in this selection.
                </p>
              )}
            </Card>
            <Card className="p-4 lg:col-span-2">
              <h3 className="font-bold">Talent pool metrics</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  label="Pools"
                  value={data.talentPools.poolCount}
                  hint="Current"
                />
                <Kpi
                  label="Memberships"
                  value={data.talentPools.memberships}
                  hint="Current"
                />
                <Kpi
                  label="Unique Candidates in Pools"
                  value={data.talentPools.uniqueCandidates}
                  hint="Current"
                />
                <Kpi
                  label="Members Added"
                  value={data.talentPools.membersAddedInRange}
                  hint="Selected period"
                />
              </div>
            </Card>
          </div>
        ) : null}
      </QuerySection>
    </Section>
  )
}

function JobComparison({
  query,
  page,
  pageSize,
  onPageChange,
}: {
  query: ReturnType<typeof useAnalyticsJobs>
  page: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const data = query.data
  const totalPages = Math.max(1, Math.ceil((data?.totalItems ?? 0) / pageSize))
  return (
    <Section title="Job Performance">
      <QuerySection
        loading={query.isPending}
        error={query.isError}
        empty={!data || data.rows.length === 0}
        retry={() => void query.refetch()}
      >
        {data ? (
          <>
            <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-sm">
              <table className="w-full min-w-[56rem] text-left text-sm">
                <caption className="sr-only">
                  Job performance comparison
                </caption>
                <thead className="bg-slate-50 text-text-secondary">
                  <tr>
                    {[
                      'Job',
                      'Applications',
                      'Active',
                      'Scheduled Interviews',
                      'Offers Sent',
                      'Hires',
                      'Rejections',
                    ].map((header) => (
                      <th key={header} scope="col" className="px-4 py-3">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <th scope="row" className="px-4 py-3 font-semibold">
                        {row.title}
                      </th>
                      <td className="px-4 py-3">{row.applications}</td>
                      <td className="px-4 py-3">{row.active}</td>
                      <td className="px-4 py-3">{row.scheduledInterviews}</td>
                      <td className="px-4 py-3">{row.offersSent}</td>
                      <td className="px-4 py-3">{row.hires}</td>
                      <td className="px-4 py-3">{row.rejections}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </>
        ) : null}
      </QuerySection>
    </Section>
  )
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous job performance page"
      >
        Previous
      </Button>
      <span className="text-sm text-text-secondary">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="secondary"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next job performance page"
      >
        Next
      </Button>
    </div>
  )
}

function useSearchPage(params: URLSearchParams) {
  const parsed = Number(params.get('page'))
  const page = Number.isInteger(parsed) && parsed > 0 ? parsed : 1
  return [page] as const
}

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  return localDateString(new Date(year, month - 1, day)) === value
}

function humanizeCode(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
