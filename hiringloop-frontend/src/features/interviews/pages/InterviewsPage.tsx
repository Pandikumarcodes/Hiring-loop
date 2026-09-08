import { Link, useSearchParams, useParams } from 'react-router-dom'
import { Button, PageHeader } from '../../../shared/components/ui'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../shared/components/feedback'
import { useOrganization } from '../../organizations/hooks/queries'
import { useCalendarInterviews } from '../hooks/queries'
import { interviewTime } from '../utils/interview-utils'
function range(date: string) {
  const d = new Date(`${date}T00:00:00.000Z`)
  const from = d.toISOString(),
    to = new Date(d.getTime() + 7 * 86400000).toISOString()
  return { from, to }
}
export function InterviewsPage() {
  const { organizationId = '' } = useParams(),
    [search, setSearch] = useSearchParams(),
    org = useOrganization(organizationId),
    requestedMine = search.get('mine') === 'true',
    start = search.get('start') ?? new Date().toISOString().slice(0, 10),
    interviewer = Boolean(
      org.data && !org.data.permissions?.includes('interview:view'),
    ),
    mine = interviewer || requestedMine,
    r = range(start),
    q = useCalendarInterviews(
      organizationId,
      r.from,
      r.to,
      mine,
      Boolean(org.data),
    )
  const canView = org.data?.permissions?.includes('interview:view-assigned')
  const move = (n: number) => {
    const d = new Date(`${start}T00:00:00.000Z`)
    d.setUTCDate(d.getUTCDate() + n * 7)
    setSearch({ start: d.toISOString().slice(0, 10), mine: String(mine) })
  }
  if (org.isPending || q.isPending)
    return <LoadingState label="Loading interviews" />
  if (!canView || q.isError)
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <ErrorState
          title="Interviews unavailable"
          description="You do not have permission to view these interviews."
          onRetry={q.isError ? () => void q.refetch() : undefined}
        />
      </main>
    )
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        title={mine || interviewer ? 'My interviews' : 'Interviews'}
        description={`Schedule for ${start} through ${new Date(r.to).toLocaleDateString()}`}
      />
      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => move(-7)}>
          Previous week
        </Button>
        <Button variant="secondary" onClick={() => move(7)}>
          Next week
        </Button>
        {!interviewer ? (
          <label className="ml-auto flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={mine}
              onChange={(e) =>
                setSearch({ start, mine: String(e.target.checked) })
              }
            />{' '}
            My interviews
          </label>
        ) : null}
      </div>
      {q.data?.length ? (
        <div className="mt-6 grid gap-3">
          {q.data.map((i) => (
            <Link
              key={i.id}
              to={`/app/organizations/${organizationId}/interviews/${i.id}`}
              className="rounded-card border border-border bg-surface p-4 hover:bg-primary-soft"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <strong>{i.title}</strong>
                <span className="text-sm">
                  {i.status === 'CANCELLED' ? 'Cancelled' : i.format}
                </span>
              </div>
              <p className="mt-2 text-sm text-text-secondary">
                {i.application.candidate.name} · {i.application.job.title}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {interviewTime(i)}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            title={
              mine
                ? 'You have no interviews scheduled for this period.'
                : 'No interviews scheduled for this period.'
            }
          />
        </div>
      )}
    </main>
  )
}
