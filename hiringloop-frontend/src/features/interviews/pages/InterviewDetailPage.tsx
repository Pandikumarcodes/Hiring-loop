import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  PageContainer,
  PageHeader,
  Textarea,
} from '../../../shared/components/ui'
import { ErrorState, LoadingState } from '../../../shared/components/feedback'
import { isApiError } from '../../../shared/lib/apiErrors'
import { useOrganization } from '../../organizations/hooks/queries'
import {
  useCancelInterview,
  useRescheduleInterview,
  useUpdateInterview,
} from '../hooks/mutations'
import { useInterview } from '../hooks/queries'
import {
  duration,
  interviewTime,
  safeMeetingUrl,
} from '../utils/interview-utils'
import { InterviewFormDialog } from '../components/InterviewFormDialog'
import { InterviewFeedback } from '../../scorecards/components/FeedbackSections'
import type { InterviewDto } from '../types/interview.types'
export function InterviewDetailPage() {
  const { organizationId = '', interviewId = '' } = useParams(),
    org = useOrganization(organizationId),
    canRead = Boolean(
      org.data?.permissions?.includes('interview:view') ||
        org.data?.permissions?.includes('interview:view-assigned'),
    ),
    q = useInterview(
      organizationId,
      interviewId,
      Boolean(organizationId && interviewId && org.data && canRead),
    ),
    [edit, setEdit] = useState(false),
    [reschedule, setReschedule] = useState(false),
    [cancel, setCancel] = useState(false)
  if (org.isPending) return <LoadingState label="Checking interview access" />
  if (org.isError)
    return (
      <PageContainer width="standard">
        <ErrorState
          title="Workspace unavailable"
          description="We could not check interview access."
          onRetry={() => void org.refetch()}
        />
      </PageContainer>
    )
  if (!canRead)
    return (
      <PageContainer width="standard">
        <ErrorState
          title="Interview access unavailable"
          description="You do not have permission to view this interview."
        />
      </PageContainer>
    )
  if (q.isPending) return <LoadingState label="Loading interview" />
  if (q.isError || !q.data)
    return (
      <PageContainer width="standard">
        <ErrorState
          title={
            isApiError(q.error) && q.error.status === 403
              ? 'Interview access unavailable'
              : isApiError(q.error) && q.error.status === 404
                ? 'Interview not found'
                : 'Interview unavailable'
          }
          description={
            isApiError(q.error) && q.error.status === 403
              ? 'You do not have permission to view this interview.'
              : isApiError(q.error) && q.error.status === 404
                ? 'This interview is unavailable.'
                : 'We could not load this interview.'
          }
          onRetry={
            q.isError &&
            !(isApiError(q.error) && [403, 404].includes(q.error.status ?? 0))
              ? () => void q.refetch()
              : undefined
          }
        />
      </PageContainer>
    )
  const i = q.data,
    manage =
      org.data?.permissions?.includes('interview:update') &&
      i.status !== 'CANCELLED'
  return (
    <PageContainer width="standard">
      <PageHeader
        breadcrumbs={
          <Link
            className="font-semibold text-text-secondary hover:text-primary-dark hover:underline"
            to={`/app/organizations/${organizationId}/interviews`}
          >
            Interviews
          </Link>
        }
        title={i.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge variant={i.status === 'CANCELLED' ? 'neutral' : 'success'}>
              {i.status === 'CANCELLED' ? 'Cancelled' : 'Scheduled'}
            </Badge>
            <span>
              {i.application.candidate.name} · {i.application.job.title}
            </span>
          </span>
        }
        actions={
          manage ? (
            <>
              <Button variant="secondary" onClick={() => setEdit(true)}>
                Edit interview
              </Button>
              <Button variant="secondary" onClick={() => setReschedule(true)}>
                Reschedule
              </Button>
              <Button variant="danger" onClick={() => setCancel(true)}>
                Cancel interview
              </Button>
            </>
          ) : null
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <div className="grid content-start gap-6">
          <Card className="p-5 sm:p-6">
            <h2 className="mb-5 text-lg font-bold">Interview overview</h2>
            <dl className="grid gap-5 sm:grid-cols-2">
              <Item
                l="Candidate"
                v={
                  <Link
                    className="break-words text-primary-dark underline focus-visible:outline-3 focus-visible:outline-primary-dark"
                    to={`/app/organizations/${organizationId}/candidates/${i.application.candidate.id}`}
                  >
                    {i.application.candidate.name}
                  </Link>
                }
              />
              <Item
                l="Job"
                v={
                  org.data?.permissions?.includes('job:read') ? (
                    <Link
                      className="break-words text-primary-dark underline focus-visible:outline-3 focus-visible:outline-primary-dark"
                      to={`/app/organizations/${organizationId}/jobs/${i.application.job.id}`}
                    >
                      {i.application.job.title}
                    </Link>
                  ) : (
                    i.application.job.title
                  )
                }
              />
              <Item
                l="Format"
                v={
                  i.format === 'ONSITE'
                    ? 'Onsite'
                    : i.format === 'VIDEO'
                      ? 'Video'
                      : 'Phone'
                }
              />
              <Item
                l="Status"
                v={i.status === 'CANCELLED' ? 'Cancelled' : 'Scheduled'}
              />
            </dl>
          </Card>
          <Card className="p-5 sm:p-6">
            <h2 className="mb-5 text-lg font-bold">Schedule and meeting</h2>
            <dl className="grid gap-5 sm:grid-cols-2">
              <Item l="When" v={interviewTime(i)} />
              <Item l="Duration" v={`${duration(i)} minutes`} />
              <Item l="Timezone" v={i.timeZone} />
              {i.location ? <Item l="Location" v={i.location} /> : null}
              {safeMeetingUrl(i.meetingUrl) ? (
                <Item
                  l="Meeting"
                  v={
                    <a
                      className="break-all text-primary-dark underline focus-visible:outline-3 focus-visible:outline-primary-dark"
                      href={safeMeetingUrl(i.meetingUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open meeting link
                    </a>
                  }
                />
              ) : null}
            </dl>
          </Card>
        </div>
        <Card className="h-fit p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-bold">Interviewers</h2>
          {i.participants.length ? (
            <ul className="grid gap-3">
              {i.participants.map((participant) => (
                <li
                  key={participant.id}
                  className="min-w-0 rounded-control border border-border p-3 text-sm break-all"
                >
                  {participant.user.email}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-secondary">
              No interviewers assigned.
            </p>
          )}
        </Card>
      </div>
      {i.cancellation ? (
        <p
          role="status"
          className="mt-6 rounded-control border border-error-border bg-error-soft p-4 text-sm text-error"
        >
          Cancelled{i.cancellation.reason ? `: ${i.cancellation.reason}` : ''}
        </p>
      ) : null}
      <div className="mt-6">
        <InterviewFeedback
          organizationId={organizationId}
          interviewId={interviewId}
          canView={
            org.data?.permissions?.includes('scorecard:view-submitted') ?? false
          }
          canComplete={
            org.data?.permissions?.includes('scorecard:complete') ?? false
          }
        />
      </div>
      {edit ? (
        <MetadataDialog i={i} o={organizationId} close={() => setEdit(false)} />
      ) : null}
      {reschedule ? (
        <RescheduleDialog
          i={i}
          o={organizationId}
          close={() => setReschedule(false)}
        />
      ) : null}
      {cancel ? (
        <CancelDialog i={i} o={organizationId} close={() => setCancel(false)} />
      ) : null}
    </PageContainer>
  )
}
const Item = ({ l, v }: { l: string; v: React.ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-sm text-text-secondary">{l}</dt>
    <dd className="mt-1 break-words font-semibold">{v}</dd>
  </div>
)
function MetadataDialog({
  i,
  o,
  close,
}: {
  i: InterviewDto
  o: string
  close: () => void
}) {
  const m = useUpdateInterview(o, i.application.id, i.id)
  return (
    <InterviewFormDialog
      organizationId={o}
      interview={i}
      mode="edit"
      busy={m.isPending}
      error={m.isError ? 'We could not update this interview.' : undefined}
      onClose={close}
      onSubmit={(v) =>
        m.mutate(
          {
            title: v.title,
            format: v.format,
            participantUserIds: v.participantUserIds,
            meetingUrl: v.meetingUrl,
            location: v.location,
          },
          { onSuccess: close },
        )
      }
    />
  )
}
function RescheduleDialog({
  i,
  o,
  close,
}: {
  i: InterviewDto
  o: string
  close: () => void
}) {
  const m = useRescheduleInterview(o, i.application.id, i.id)
  return (
    <InterviewFormDialog
      organizationId={o}
      interview={i}
      mode="reschedule"
      busy={m.isPending}
      error={
        isApiError(m.error) && m.error.code === 'INTERVIEW_SCHEDULE_CONFLICT'
          ? 'One or more selected interviewers already have an overlapping interview at this time.'
          : m.isError
            ? 'We could not reschedule this interview.'
            : undefined
      }
      onClose={close}
      onSubmit={(v) =>
        m.mutate(
          {
            scheduledStartAt: v.scheduledStartAt,
            durationMinutes: v.durationMinutes,
            timeZone: v.timeZone,
          },
          { onSuccess: close },
        )
      }
    />
  )
}
function CancelDialog({
  i,
  o,
  close,
}: {
  i: InterviewDto
  o: string
  close: () => void
}) {
  const [reason, setReason] = useState(''),
    m = useCancelInterview(o, i.application.id, i.id)
  return (
    <Dialog open onOpenChange={(open) => !open && !m.isPending && close()}>
      <DialogContent aria-describedby="cancel-interview-description">
        <DialogTitle>Cancel interview?</DialogTitle>
        <DialogDescription id="cancel-interview-description">
          This keeps the interview in HiringLoop but marks it cancelled.
        </DialogDescription>
        <Textarea
          className="mt-4"
          value={reason}
          maxLength={500}
          aria-label="Cancellation reason (optional)"
          placeholder="Reason (optional)"
          onChange={(e) => setReason(e.target.value)}
        />
        {m.isError ? (
          <p role="alert" className="mt-2 text-sm text-red-800">
            We could not cancel this interview.
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" disabled={m.isPending} onClick={close}>
            Keep interview
          </Button>
          <Button
            variant="danger"
            loading={m.isPending}
            onClick={() => {
              if (!m.isPending) m.mutate(reason, { onSuccess: close })
            }}
          >
            Cancel interview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
