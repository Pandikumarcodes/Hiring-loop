import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../../shared/components/feedback'
import { Badge, Button, PageHeader } from '../../../shared/components/ui'
import { ConfirmDialog } from '../../team/components/ConfirmDialog'
import { isApiError } from '../../../shared/lib/apiErrors'
import { useMyScorecard } from '../hooks/queries'
import { useSaveMyScorecard, useSubmitMyScorecard } from '../hooks/mutations'
import { ScorecardForm } from '../components/ScorecardForm'
import { ScorecardReadOnly } from '../components/ScorecardReadOnly'
export function MyScorecardPage() {
  const { organizationId = '', interviewId = '' } = useParams(),
    q = useMyScorecard(
      organizationId,
      interviewId,
      Boolean(organizationId && interviewId),
    ),
    save = useSaveMyScorecard(organizationId, interviewId),
    submit = useSubmitMyScorecard(organizationId, interviewId),
    [pending, setPending] = useState<
      Parameters<typeof submit.mutate>[0] | null
    >(null)
  if (q.isPending) return <LoadingState label="Loading your scorecard" />
  if (q.isError || !q.data)
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <ErrorState
          title="Scorecard unavailable"
          description="A scorecard has not been configured for this job or you are not assigned to this interview."
          onRetry={() => void q.refetch()}
        />
      </main>
    )
  const s = q.data,
    conflict = [save.error, submit.error].some(
      (error) => isApiError(error) && error.status === 409,
    )
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        title="Your Scorecard"
        description={s.templateVersion?.title ?? 'Interview feedback'}
      />
      <section className="mt-6 rounded-card border border-border bg-surface p-5 sm:p-6">
        <Badge variant={s.status === 'SUBMITTED' ? 'success' : 'neutral'}>
          {s.status}
        </Badge>
        <div className="mt-5">
          {s.status === 'SUBMITTED' && s.templateVersion ? (
            <ScorecardReadOnly
              template={s.templateVersion}
              responses={s.responses}
              recommendation={s.overallRecommendation}
              comment={s.overallComment}
              submittedAt={s.submittedAt}
            />
          ) : (
            <>
              <ScorecardForm
                key={`${s.id ?? 'new'}-${s.revision ?? 'none'}`}
                scorecard={s}
                busy={save.isPending || submit.isPending}
                error={
                  conflict
                    ? 'This scorecard changed in another session. Reload the latest version before continuing.'
                    : save.isError || submit.isError
                      ? 'We could not save your scorecard.'
                      : undefined
                }
                onSave={(responses, r, c) =>
                  save.mutate({
                    expectedRevision: s.revision ?? undefined,
                    responses,
                    overallRecommendation: r,
                    overallComment: c,
                  })
                }
                onSubmit={(responses, r, c) =>
                  setPending({
                    expectedRevision: s.revision ?? undefined,
                    responses,
                    overallRecommendation: r,
                    overallComment: c,
                  })
                }
              />
              {conflict ? (
                <Button
                  className="mt-3"
                  type="button"
                  variant="secondary"
                  onClick={() => void q.refetch()}
                >
                  Reload latest version
                </Button>
              ) : null}
            </>
          )}
        </div>
      </section>
      {pending ? (
        <ConfirmDialog
          title="Submit scorecard?"
          description="Your feedback cannot be edited after submission."
          confirmLabel="Submit Scorecard"
          busy={submit.isPending}
          onCancel={() => setPending(null)}
          onConfirm={() =>
            submit.mutate(pending, { onSuccess: () => setPending(null) })
          }
        />
      ) : null}
    </main>
  )
}
