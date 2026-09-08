import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../shared/components/ui'
import { ErrorState } from '../../../shared/components/feedback'
import { isApiError } from '../../../shared/lib/apiErrors'
import { useScheduleInterview } from '../hooks/mutations'
import { useApplicationInterviews } from '../hooks/queries'
import { interviewTime } from '../utils/interview-utils'
import { InterviewFormDialog } from './InterviewFormDialog'
export function ApplicationInterviews({
  organizationId,
  applicationId,
  canSchedule,
}: {
  organizationId: string
  applicationId: string
  canSchedule: boolean
}) {
  const [open, setOpen] = useState(false),
    [now] = useState(() => Date.now()),
    q = useApplicationInterviews(organizationId, applicationId),
    m = useScheduleInterview(organizationId, applicationId)
  if (q.isPending)
    return (
      <section
        className="rounded-card border border-border bg-surface p-5"
        aria-busy="true"
      >
        <h2 className="text-lg font-bold">Interviews</h2>
        <p className="mt-3 text-sm text-text-secondary">Loading interviews…</p>
      </section>
    )
  if (q.isError)
    return (
      <section className="rounded-card border border-border bg-surface p-5">
        <ErrorState
          title="Interviews unavailable"
          description="We could not load interviews."
          onRetry={() => void q.refetch()}
        />
      </section>
    )
  const groups = [
    [
      'Upcoming',
      q.data?.filter(
        (i) => i.status !== 'CANCELLED' && Date.parse(i.scheduledEndAt) >= now,
      ) ?? [],
    ],
    [
      'Past',
      q.data?.filter(
        (i) => i.status !== 'CANCELLED' && Date.parse(i.scheduledEndAt) < now,
      ) ?? [],
    ],
    ['Cancelled', q.data?.filter((i) => i.status === 'CANCELLED') ?? []],
  ] as const
  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Interviews</h2>
        {canSchedule ? (
          <Button onClick={() => setOpen(true)}>Schedule interview</Button>
        ) : null}
      </div>
      {q.data?.length ? (
        <div className="mt-5 grid gap-5">
          {groups.map(([name, items]) =>
            items.length ? (
              <div key={name}>
                <h3 className="font-semibold">{name}</h3>
                <div className="mt-2 grid gap-2">
                  {items.map((i) => (
                    <Link
                      key={i.id}
                      className="rounded-control border border-border p-3 hover:bg-primary-soft focus-visible:outline-3 focus-visible:outline-primary-dark"
                      to={`/app/organizations/${organizationId}/interviews/${i.id}`}
                    >
                      <strong>{i.title}</strong>
                      <p className="mt-1 text-sm text-text-secondary">
                        {interviewTime(i)} · {i.participants.length} interviewer
                        {i.participants.length === 1 ? '' : 's'}{' '}
                        {i.status === 'CANCELLED' ? '· Cancelled' : ''}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-text-secondary">
          No interviews scheduled yet.
        </p>
      )}
      {open ? (
        <InterviewFormDialog
          organizationId={organizationId}
          busy={m.isPending}
          error={
            isApiError(m.error) &&
            m.error.code === 'INTERVIEW_SCHEDULE_CONFLICT'
              ? 'One or more selected interviewers already have an overlapping interview at this time.'
              : m.isError
                ? 'We could not schedule this interview.'
                : undefined
          }
          onClose={() => {
            setOpen(false)
            m.reset()
          }}
          onSubmit={(v) => m.mutate(v, { onSuccess: () => setOpen(false) })}
        />
      ) : null}
    </section>
  )
}
