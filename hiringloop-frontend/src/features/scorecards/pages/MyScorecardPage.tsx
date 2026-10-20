import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../../shared/components/feedback'
import {
  Badge,
  Button,
  Card,
  PageContainer,
  PageHeader,
} from '../../../shared/components/ui'
import { ConfirmDialog } from '../../team/components/ConfirmDialog'
import { isApiError } from '../../../shared/lib/apiErrors'
import { useMyScorecard } from '../hooks/queries'
import { useSaveMyScorecard, useSubmitMyScorecard } from '../hooks/mutations'
import { ScorecardForm } from '../components/ScorecardForm'
import { ScorecardReadOnly } from '../components/ScorecardReadOnly'
import type { Scorecard } from '../types/scorecard.types'
export function MyScorecardPage() {
  const { organizationId = '', interviewId = '' } = useParams(),
    q = useMyScorecard(
      organizationId,
      interviewId,
      Boolean(organizationId && interviewId),
    )
  if (q.isPending) return <LoadingState label="Loading your scorecard" />
  if (q.isError || !q.data)
    return (
      <PageContainer width="standard">
        <ErrorState
          title="Scorecard unavailable"
          description="A scorecard has not been configured for this job or you are not assigned to this interview."
          onRetry={() => void q.refetch()}
        />
      </PageContainer>
    )
  return (
    <ScorecardContent
      key={q.data.interviewParticipantId}
      organizationId={organizationId}
      interviewId={interviewId}
      scorecard={q.data}
      onReload={async () => {
        const result = await q.refetch()
        return result.isSuccess ? result.data : null
      }}
    />
  )
}

function ScorecardContent({
  organizationId,
  interviewId,
  scorecard: s,
  onReload,
}: {
  organizationId: string
  interviewId: string
  scorecard: Scorecard
  onReload: () => Promise<Scorecard | null>
}) {
  const save = useSaveMyScorecard(organizationId, interviewId),
    submit = useSubmitMyScorecard(organizationId, interviewId),
    [expectedRevision, setExpectedRevision] = useState(s.revision),
    [reloadVersion, setReloadVersion] = useState(0),
    [pending, setPending] = useState<
      Parameters<typeof submit.mutate>[0] | null
    >(null),
    conflict = [save.error, submit.error].some(
      (error) => isApiError(error) && error.status === 409,
    )
  return (
    <PageContainer width="standard">
      <PageHeader
        breadcrumbs={
          <Link
            className="font-semibold text-text-secondary hover:text-primary-dark hover:underline"
            to={`/app/organizations/${organizationId}/interviews/${interviewId}`}
          >
            Interview
          </Link>
        }
        title="Your Scorecard"
        description={s.templateVersion?.title ?? 'Interview feedback'}
      />
      <Card className="p-5 sm:p-6">
        <Badge variant={s.status === 'SUBMITTED' ? 'success' : 'neutral'}>
          {s.status === 'NOT_STARTED'
            ? 'Not started'
            : s.status === 'SUBMITTED'
              ? 'Submitted'
              : 'Draft'}
        </Badge>
        {save.isSuccess && !conflict && s.status !== 'SUBMITTED' ? (
          <p role="status" className="mt-3 text-sm text-success">
            Draft saved.
          </p>
        ) : null}
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
                key={`${s.interviewParticipantId}-${reloadVersion}`}
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
                  save.mutate(
                    {
                      expectedRevision: expectedRevision ?? undefined,
                      responses,
                      overallRecommendation: r,
                      overallComment: c,
                    },
                    {
                      onSuccess: (saved) => setExpectedRevision(saved.revision),
                    },
                  )
                }
                onSubmit={(responses, r, c) =>
                  setPending({
                    expectedRevision: expectedRevision ?? undefined,
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
                  onClick={() => {
                    void onReload().then((latest) => {
                      if (latest) {
                        setExpectedRevision(latest.revision)
                        save.reset()
                        submit.reset()
                        setReloadVersion((value) => value + 1)
                      }
                    })
                  }}
                >
                  Reload latest version
                </Button>
              ) : null}
            </>
          )}
        </div>
      </Card>
      {pending ? (
        <ConfirmDialog
          title="Submit scorecard?"
          description="Your feedback cannot be edited after submission."
          confirmLabel="Submit Scorecard"
          busy={submit.isPending}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            if (!submit.isPending)
              submit.mutate(pending, { onSuccess: () => setPending(null) })
          }}
        />
      ) : null}
    </PageContainer>
  )
}
