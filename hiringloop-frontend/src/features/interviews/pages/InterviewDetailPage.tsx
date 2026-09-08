import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  PageHeader,
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
export function InterviewDetailPage() {
  const { organizationId = '', interviewId = '' } = useParams(),
    org = useOrganization(organizationId),
    q = useInterview(organizationId, interviewId, Boolean(org.data)),
    [edit, setEdit] = useState(false),
    [reschedule, setReschedule] = useState(false),
    [cancel, setCancel] = useState(false)
  if (org.isPending || q.isPending)
    return <LoadingState label="Loading interview" />
  if (q.isError || !q.data)
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <ErrorState
          title="Interview not found"
          description="This interview is unavailable."
          onRetry={q.isError ? () => void q.refetch() : undefined}
        />
      </main>
    )
  const i = q.data,
    manage =
      org.data?.permissions?.includes('interview:update') &&
      i.status !== 'CANCELLED'
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        title={i.title}
        description={
          i.status === 'CANCELLED' ? 'Cancelled interview' : 'Interview details'
        }
      />
      <div className="mt-6 rounded-card border border-border bg-surface p-6">
        <div className="flex flex-wrap gap-2">
          {manage ? (
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
          ) : null}
        </div>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <Item
            l="Candidate"
            v={
              <Link
                className="text-primary-dark underline"
                to={`/app/organizations/${organizationId}/candidates/${i.application.candidate.id}`}
              >
                {i.application.candidate.name}
              </Link>
            }
          />
          <Item l="Job" v={i.application.job.title} />
          <Item l="Format" v={i.format} />
          <Item l="When" v={interviewTime(i)} />
          <Item l="Duration" v={`${duration(i)} minutes`} />
          <Item
            l="Interviewers"
            v={i.participants.map((p) => p.user.email).join(', ')}
          />
          {i.location ? <Item l="Location" v={i.location} /> : null}
          {safeMeetingUrl(i.meetingUrl) ? (
            <Item
              l="Meeting"
              v={
                <a
                  className="text-primary-dark underline"
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
        {i.cancellation ? (
          <p className="mt-6 rounded-control bg-red-50 p-3 text-sm text-red-800">
            Cancelled{i.cancellation.reason ? `: ${i.cancellation.reason}` : ''}
          </p>
        ) : null}
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
    </main>
  )
}
const Item = ({ l, v }: { l: string; v: React.ReactNode }) => (
  <div>
    <dt className="text-sm text-text-secondary">{l}</dt>
    <dd className="mt-1 font-semibold">{v}</dd>
  </div>
)
function MetadataDialog({
  i,
  o,
  close,
}: {
  i: any
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
  i: any
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
  i: any
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
        <textarea
          className="mt-4 w-full rounded-control border border-border p-2"
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
          <Button variant="secondary" onClick={close}>
            Keep interview
          </Button>
          <Button
            variant="danger"
            loading={m.isPending}
            onClick={() => m.mutate(reason, { onSuccess: close })}
          >
            Cancel interview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
