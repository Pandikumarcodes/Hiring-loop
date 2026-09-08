import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Textarea,
} from '../../../shared/components/ui'
import { ErrorState } from '../../../shared/components/feedback'
import { isApiError } from '../../../shared/lib/apiErrors'
import { ConfirmDialog } from '../../team/components/ConfirmDialog'
import { useCurrentUser } from '../../auth/hooks/queries'
import {
  useApplicationNotes,
  useApplicationScorecards,
  useInterviewScorecards,
  useMyScorecard,
  useSubmittedScorecard,
} from '../hooks/queries'
import { useCreateNote, useDeleteNote, useUpdateNote } from '../hooks/mutations'
import { recommendationLabel } from '../utils/recommendation'
import { ScorecardReadOnly } from './ScorecardReadOnly'

const card = 'rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6'

function SubmittedScorecardDialog({
  organizationId,
  interviewId,
  scorecardId,
  onClose,
}: {
  organizationId: string
  interviewId: string
  scorecardId: string
  onClose: () => void
}) {
  const query = useSubmittedScorecard(organizationId, interviewId, scorecardId)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        aria-describedby="submitted-scorecard-description"
        className="max-w-2xl"
      >
        <DialogTitle>Submitted scorecard</DialogTitle>
        <DialogDescription id="submitted-scorecard-description">
          Read-only interview feedback.
        </DialogDescription>
        {query.isPending ? (
          <p className="mt-4">Loading submitted scorecard…</p>
        ) : query.isError || !query.data ? (
          <ErrorState
            title="Scorecard unavailable"
            description="We could not load this submitted scorecard."
            onRetry={() => void query.refetch()}
          />
        ) : (
          <div className="mt-4">
            <p className="text-sm text-text-secondary">
              Participant ID: {query.data.participant.id}
            </p>
            <p className="text-sm text-text-secondary">Submitted</p>
            <p className="text-sm text-text-secondary">
              Template v{query.data.templateVersion.versionNumber}:{' '}
              {query.data.templateVersion.title}
            </p>
            <div className="mt-4">
              <ScorecardReadOnly
                template={query.data.templateVersion}
                responses={query.data.responses}
                recommendation={query.data.overallRecommendation}
                comment={query.data.overallComment}
                submittedAt={query.data.submittedAt}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function InterviewFeedback({
  organizationId,
  interviewId,
  canView,
  canComplete,
}: {
  organizationId: string
  interviewId: string
  canView: boolean
  canComplete: boolean
}) {
  const summary = useInterviewScorecards(organizationId, interviewId, canView)
  const mine = useMyScorecard(organizationId, interviewId, canComplete)
  const [selected, setSelected] = useState<string | null>(null)
  if (canComplete && !canView)
    return (
      <section className={card}>
        <h2 className="text-lg font-bold">Your Scorecard</h2>
        {mine.isPending ? (
          <p className="mt-3 text-sm">Loading scorecard…</p>
        ) : mine.data ? (
          <>
            <p className="mt-3 text-sm text-text-secondary">
              {mine.data.status.replace('_', ' ')}
            </p>
            <Link
              className="mt-3 inline-block font-bold text-primary-dark underline"
              to={`/app/organizations/${organizationId}/interviews/${interviewId}/scorecard`}
            >
              {mine.data.status === 'SUBMITTED'
                ? 'View Your Scorecard'
                : 'Continue Scorecard'}
            </Link>
          </>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">
            A scorecard has not been configured for this job.
          </p>
        )}
      </section>
    )
  if (!canView) return null
  if (summary.isPending)
    return (
      <section className={card} aria-busy="true">
        <h2 className="text-lg font-bold">Interview Feedback</h2>
        <p className="mt-3 text-sm">Loading feedback…</p>
      </section>
    )
  if (summary.isError)
    return (
      <section className={card}>
        <ErrorState
          title="Feedback unavailable"
          description="We could not load interview feedback."
          onRetry={() => void summary.refetch()}
        />
      </section>
    )
  return (
    <section className={card}>
      <h2 className="text-lg font-bold">Interview Feedback</h2>
      <div className="mt-4 grid gap-3">
        {summary.data?.participants.map((participant) => (
          <div
            key={participant.participant.id}
            className="rounded-control border border-border p-3"
          >
            <p className="font-semibold">Interviewer</p>
            <p className="text-sm text-text-secondary">
              {participant.status.replace('_', ' ')}
            </p>
            {participant.status === 'SUBMITTED' ? (
              <>
                <p className="mt-1 text-sm">
                  {recommendationLabel(participant.overallRecommendation)}
                </p>
                {participant.id ? (
                  <Button
                    className="mt-2"
                    variant="secondary"
                    onClick={() => setSelected(participant.id!)}
                  >
                    View Scorecard
                  </Button>
                ) : null}
              </>
            ) : (
              <p className="mt-1 text-sm text-text-secondary">
                Feedback pending
              </p>
            )}
          </div>
        ))}
      </div>
      {selected ? (
        <SubmittedScorecardDialog
          organizationId={organizationId}
          interviewId={interviewId}
          scorecardId={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  )
}

export function ApplicationFeedback({
  organizationId,
  applicationId,
  enabled,
}: {
  organizationId: string
  applicationId: string
  enabled: boolean
}) {
  const query = useApplicationScorecards(organizationId, applicationId, enabled)
  const [selected, setSelected] = useState<{
    interviewId: string
    scorecardId: string
  } | null>(null)
  if (!enabled) return null
  if (query.isPending)
    return (
      <section className={card}>
        <h2 className="text-lg font-bold">Interview Feedback</h2>
        <p className="mt-3 text-sm">Loading feedback…</p>
      </section>
    )
  if (query.isError)
    return (
      <section className={card}>
        <ErrorState
          title="Feedback unavailable"
          description="We could not load submitted feedback."
          onRetry={() => void query.refetch()}
        />
      </section>
    )
  const submitted =
    query.data?.interviews.flatMap((interview) =>
      interview.participants
        .filter((participant) => participant.scorecard)
        .map((participant) => ({ interview, participant })),
    ) ?? []
  return (
    <section className={card}>
      <h2 className="text-lg font-bold">Interview Feedback</h2>
      {submitted.length ? (
        <div className="mt-4 grid gap-4">
          {submitted.map(({ interview, participant }) => (
            <div
              key={participant.scorecard!.id}
              className="border-b border-border pb-3 last:border-0"
            >
              <p className="font-semibold">{interview.title}</p>
              <p className="text-sm">
                {recommendationLabel(
                  participant.scorecard!.overallRecommendation,
                )}
              </p>
              <Button
                className="mt-2"
                variant="secondary"
                onClick={() =>
                  setSelected({
                    interviewId: interview.id,
                    scorecardId: participant.scorecard!.id,
                  })
                }
              >
                View Scorecard
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-text-secondary">
          No interview feedback has been submitted yet.
        </p>
      )}
      {selected ? (
        <SubmittedScorecardDialog
          organizationId={organizationId}
          interviewId={selected.interviewId}
          scorecardId={selected.scorecardId}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  )
}

export function InternalNotes({
  organizationId,
  applicationId,
  enabled,
  isAdmin,
}: {
  organizationId: string
  applicationId: string
  enabled: boolean
  isAdmin: boolean
}) {
  const user = useCurrentUser(),
    query = useApplicationNotes(organizationId, applicationId, enabled),
    create = useCreateNote(organizationId, applicationId),
    update = useUpdateNote(organizationId, applicationId),
    remove = useDeleteNote(organizationId, applicationId)
  const [body, setBody] = useState(''),
    [editing, setEditing] = useState<{
      id: string
      revision: number
      body: string
    } | null>(null),
    [deleting, setDeleting] = useState<string | null>(null)
  if (!enabled) return null
  const save = () => {
    const value = body.trim()
    if (value) create.mutate(value, { onSuccess: () => setBody('') })
  }
  return (
    <section className={card}>
      <h2 className="text-lg font-bold">Internal Notes</h2>
      <label className="mt-4 block font-semibold">
        Add note
        <Textarea
          value={body}
          maxLength={10000}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      <Button
        className="mt-2"
        loading={create.isPending}
        disabled={!body.trim()}
        onClick={save}
      >
        Add Note
      </Button>
      {create.isError ? (
        <p role="alert" className="mt-2 text-sm text-red-800">
          We could not add this note.
        </p>
      ) : null}
      {query.isPending ? (
        <p className="mt-4 text-sm">Loading notes…</p>
      ) : query.isError ? (
        <ErrorState
          title="Notes unavailable"
          description="We could not load internal notes."
          onRetry={() => void query.refetch()}
        />
      ) : query.data?.length ? (
        <div className="mt-5 grid gap-4">
          {query.data.map((note) => {
            const permitted = note.author.id === user.user?.id || isAdmin
            return (
              <article
                key={note.id}
                className="rounded-control border border-border p-3"
              >
                <p className="whitespace-pre-wrap">{note.body}</p>
                <p className="mt-2 text-xs text-text-secondary">
                  {new Date(note.updatedAt).toLocaleString()}
                </p>
                {permitted ? (
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setEditing({
                          id: note.id,
                          revision: note.revision,
                          body: note.body,
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setDeleting(note.id)}
                    >
                      Delete
                    </Button>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-text-secondary">
          No internal notes yet.
        </p>
      )}
      {editing ? (
        <NoteDialog
          value={editing.body}
          busy={update.isPending}
          conflict={isApiError(update.error) && update.error.status === 409}
          onReload={() => {
            void query.refetch()
            setEditing(null)
          }}
          onCancel={() => setEditing(null)}
          onSave={(value) =>
            update.mutate(
              {
                id: editing.id,
                body: value,
                expectedRevision: editing.revision,
              },
              { onSuccess: () => setEditing(null) },
            )
          }
        />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title="Delete note?"
          description="This action cannot be undone."
          confirmLabel="Delete"
          danger
          busy={remove.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            remove.mutate(deleting, { onSuccess: () => setDeleting(null) })
          }
        />
      ) : null}
    </section>
  )
}

function NoteDialog({
  value,
  busy,
  conflict,
  onReload,
  onCancel,
  onSave,
}: {
  value: string
  busy: boolean
  conflict: boolean
  onReload: () => void
  onCancel: () => void
  onSave: (value: string) => void
}) {
  const [body, setBody] = useState(value)
  return (
    <ConfirmDialog
      title="Edit Note"
      description={
        <label className="block">
          Note
          <Textarea
            value={body}
            maxLength={10000}
            onChange={(event) => setBody(event.target.value)}
          />
          {conflict ? (
            <span role="alert" className="text-red-800">
              This note changed since you opened it. Reload the latest version
              before editing again.{' '}
              <Button type="button" variant="secondary" onClick={onReload}>
                Reload latest version
              </Button>
            </span>
          ) : null}
        </label>
      }
      confirmLabel="Save"
      busy={busy}
      onCancel={onCancel}
      onConfirm={() => body.trim() && onSave(body.trim())}
    />
  )
}
