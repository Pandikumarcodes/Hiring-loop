import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  PageContainer,
  PageHeader,
} from '../../../shared/components/ui'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../shared/components/feedback'
import { useOrganization } from '../../organizations/hooks/queries'
import { useCalendarInterviews } from '../hooks/queries'
import type { InterviewDto } from '../types/interview.types'
import { dateInput, interviewTime } from '../utils/interview-utils'

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function displayDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00.000Z`))
}

function interviewDays(interviews: readonly InterviewDto[]) {
  const groups = new Map<string, InterviewDto[]>()
  for (const interview of [...interviews].sort((a, b) =>
    a.scheduledStartAt.localeCompare(b.scheduledStartAt),
  )) {
    const day = dateInput(interview.scheduledStartAt, interview.timeZone)
    groups.set(day, [...(groups.get(day) ?? []), interview])
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export function InterviewsPage() {
  const { organizationId = '' } = useParams()
  const [search, setSearch] = useSearchParams()
  const organization = useOrganization(organizationId, Boolean(organizationId))
  const permissions = organization.data?.permissions
  const canViewAll = permissions?.includes('interview:view') ?? false
  const canViewAssigned =
    permissions?.includes('interview:view-assigned') ?? false
  const canView = canViewAll || canViewAssigned
  const assignedOnly = !canViewAll
  const mine = assignedOnly || search.get('mine') === 'true'
  const requestedStart = search.get('start')
  const start =
    requestedStart &&
    /^\d{4}-\d{2}-\d{2}$/.test(requestedStart) &&
    !Number.isNaN(Date.parse(`${requestedStart}T00:00:00.000Z`))
      ? requestedStart
      : new Date().toISOString().slice(0, 10)
  const end = addDays(start, 7)
  const interviews = useCalendarInterviews(
    organizationId,
    `${start}T00:00:00.000Z`,
    `${end}T00:00:00.000Z`,
    mine,
    Boolean(organizationId && organization.data && canView),
  )
  const setWeek = (next: string, assigned = mine) =>
    setSearch({ start: next, mine: String(assigned) })

  if (organization.isPending)
    return <LoadingState label="Checking interview access" />
  if (organization.isError)
    return (
      <PageContainer width="standard">
        <ErrorState
          title="Workspace unavailable"
          description="We could not check interview access."
          onRetry={() => void organization.refetch()}
        />
      </PageContainer>
    )
  if (!canView)
    return (
      <PageContainer width="standard">
        <ErrorState
          title="Interviews unavailable"
          description="You do not have permission to view these interviews."
        />
      </PageContainer>
    )
  if (interviews.isPending || interviews.isPlaceholderData)
    return <LoadingState label="Loading interviews" />
  if (interviews.isError)
    return (
      <PageContainer width="standard">
        <ErrorState
          title="Interviews unavailable"
          description="We could not load the interview schedule."
          onRetry={() => void interviews.refetch()}
        />
      </PageContainer>
    )

  return (
    <PageContainer width="standard">
      <PageHeader
        title={mine ? 'My interviews' : 'Interviews'}
        description={
          <>
            {mine
              ? 'Interviews assigned to you'
              : 'Organization interview schedule'}
            {organization.data.name ? ` · ${organization.data.name}` : ''}
          </>
        }
      />
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setWeek(addDays(start, -7))}
          >
            Previous week
          </Button>
          <Button
            variant="secondary"
            onClick={() => setWeek(new Date().toISOString().slice(0, 10))}
          >
            Current week
          </Button>
          <Button
            variant="secondary"
            onClick={() => setWeek(addDays(start, 7))}
          >
            Next week
          </Button>
          {!assignedOnly ? (
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold sm:ml-auto">
              <input
                type="checkbox"
                checked={mine}
                onChange={(event) => setWeek(start, event.target.checked)}
              />
              My interviews
            </label>
          ) : null}
        </div>
        <p className="mt-3 text-sm text-text-secondary" aria-live="polite">
          {displayDate(start)} through {displayDate(addDays(start, 6))}
        </p>
      </Card>
      {interviews.data?.length ? (
        <div className="mt-6 grid gap-6">
          {interviewDays(interviews.data).map(([day, items]) => (
            <section key={day} aria-label={displayDate(day)}>
              <h2 className="mb-3 text-lg font-bold text-text-primary">
                {displayDate(day)}
              </h2>
              <div className="grid gap-3">
                {items.map((interview) => (
                  <Link
                    key={interview.id}
                    to={`/app/organizations/${organizationId}/interviews/${interview.id}`}
                    className="block min-w-0 rounded-card border border-border bg-surface-raised p-4 shadow-surface transition-colors hover:border-primary hover:bg-primary-soft focus-visible:outline-3 focus-visible:outline-primary-dark focus-visible:outline-offset-2 sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <strong className="min-w-0 break-words text-base text-text-primary">
                        {interview.title}
                      </strong>
                      <Badge
                        variant={
                          interview.status === 'CANCELLED'
                            ? 'neutral'
                            : 'success'
                        }
                      >
                        {interview.status === 'CANCELLED'
                          ? 'Cancelled'
                          : 'Scheduled'}
                      </Badge>
                    </div>
                    <p className="mt-2 break-words text-sm font-semibold">
                      {interview.application.candidate.name} ·{' '}
                      {interview.application.job.title}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {interviewTime(interview)}
                    </p>
                    <p className="mt-1 break-words text-sm text-text-secondary">
                      {interview.format === 'ONSITE'
                        ? 'Onsite'
                        : interview.format === 'VIDEO'
                          ? 'Video'
                          : 'Phone'}
                      {' · '}
                      {interview.participants.length} interviewer
                      {interview.participants.length === 1 ? '' : 's'}
                      {interview.location ? ` · ${interview.location}` : ''}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            title={
              mine
                ? 'No matching interviews this week'
                : 'No interviews scheduled this week'
            }
            description={
              mine
                ? 'Try another week or view the organization schedule.'
                : 'Try another week to see more interviews.'
            }
          />
        </div>
      )}
    </PageContainer>
  )
}
