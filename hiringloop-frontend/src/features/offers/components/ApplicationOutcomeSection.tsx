import { useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  Select,
  Textarea,
} from '../../../shared/components/ui'
import { ConfirmDialog } from '../../team/components/ConfirmDialog'
import { isApiError } from '../../../shared/lib/apiErrors'
import { useOffer } from '../hooks/queries'
import { useOfferActions } from '../hooks/mutations'
import { usePools } from '../../talent-pools/hooks/queries'
import type { ApplicationDetailDto } from '../../candidate-management/types/candidate-management.types'
const reasons = [
  'ROLE_CLOSED',
  'CANDIDATE_WITHDREW',
  'QUALIFICATIONS',
  'INTERVIEW_FEEDBACK',
  'OTHER',
] as const
export function ApplicationOutcomeSection({
  organizationId,
  application,
  permissions,
}: {
  organizationId: string
  application: ApplicationDetailDto
  permissions: readonly string[]
}) {
  const mayManage = permissions.includes('application:hire')
  const offer = useOffer(
    organizationId,
    application.id,
    permissions.includes('offer:view'),
  )
  const actions = useOfferActions(organizationId, application.id)
  const [dialog, setDialog] = useState<'hire' | 'reject' | 'reopen' | null>(
    null,
  )
  const current = application.outcome ?? 'ACTIVE'
  const history = application.outcomeHistory ?? []
  const revision = application.outcomeRevision ?? 1
  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Application outcome</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Outcome is separate from the pipeline stage.
          </p>
        </div>
        <Badge
          variant={
            current === 'HIRED'
              ? 'success'
              : current === 'REJECTED'
                ? 'danger'
                : 'warning'
          }
        >
          {current}
        </Badge>
      </div>
      {mayManage ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {current === 'ACTIVE' ? (
            <>
              <Button
                disabled={offer.data?.status !== 'ACCEPTED'}
                title={
                  offer.data?.status !== 'ACCEPTED'
                    ? 'An accepted offer is required before hiring.'
                    : undefined
                }
                onClick={() => setDialog('hire')}
              >
                Hire
              </Button>
              <Button variant="danger" onClick={() => setDialog('reject')}>
                Reject
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setDialog('reopen')}>
              Reopen
            </Button>
          )}
        </div>
      ) : null}
      {current === 'ACTIVE' &&
      mayManage &&
      offer.data?.status !== 'ACCEPTED' ? (
        <p className="mt-2 text-sm text-text-secondary">
          Hire becomes available after an offer is recorded as accepted.
        </p>
      ) : null}
      <ol className="mt-5 grid gap-3">
        {history.length ? (
          history.map((event) => (
            <li key={event.id} className="border-l-2 border-primary pl-4">
              <p className="font-semibold">
                {event.type.toLowerCase().replaceAll('_', ' ')}
              </p>
              <p className="text-sm text-text-secondary">
                {new Date(event.occurredAt).toLocaleString()}
                {event.reasonCode
                  ? ` · ${event.reasonCode.replaceAll('_', ' ')}`
                  : ''}
              </p>
              {event.reasonDetails ? (
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {event.reasonDetails}
                </p>
              ) : null}
            </li>
          ))
        ) : (
          <li className="text-sm text-text-secondary">
            No outcome changes recorded.
          </li>
        )}
      </ol>
      {dialog === 'hire' ? (
        <ConfirmDialog
          title="Mark candidate as hired?"
          description="Mark this candidate as hired for this application."
          confirmLabel="Mark hired"
          busy={actions.outcome.isPending}
          onCancel={() => setDialog(null)}
          onConfirm={() =>
            actions.outcome.mutate(
              {
                action: 'hire',
                body: { expectedRevision: revision },
              },
              { onSuccess: () => setDialog(null) },
            )
          }
        />
      ) : null}
      {dialog === 'reject' ? (
        <RejectDialog
          revision={revision}
          mutation={actions.outcome}
          organizationId={organizationId}
          canSelectPool={permissions.includes('talent-pool:view')}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === 'reopen' ? (
        <ReopenDialog
          revision={revision}
          mutation={actions.outcome}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {actions.outcome.isError ? (
        <p role="alert" className="mt-3 text-sm text-error">
          {isApiError(actions.outcome.error) &&
          actions.outcome.error.code ===
            'APPLICATION_HIRE_REQUIRES_ACCEPTED_OFFER'
            ? 'An accepted offer is required before hiring.'
            : isApiError(actions.outcome.error) &&
                actions.outcome.error.code === 'TALENT_POOL_NOT_FOUND'
              ? 'The selected Talent Pool is no longer available. Choose another pool or reject without one.'
              : isApiError(actions.outcome.error) &&
                  actions.outcome.error.status === 409
                ? 'This application changed elsewhere. Reload the latest outcome.'
                : 'We could not update the application outcome.'}
        </p>
      ) : null}
    </section>
  )
}
function RejectDialog({
  revision,
  mutation,
  organizationId,
  canSelectPool,
  onClose,
}: {
  revision: number
  mutation: ReturnType<typeof useOfferActions>['outcome']
  organizationId: string
  canSelectPool: boolean
  onClose: () => void
}) {
  const [reason, setReason] =
      useState<(typeof reasons)[number]>('QUALIFICATIONS'),
    [details, setDetails] = useState('')
  const [talentPoolId, setTalentPoolId] = useState('')
  const pools = usePools(organizationId, 1, '', canSelectPool)
  return (
    <Dialog open onOpenChange={(x) => !x && !mutation.isPending && onClose()}>
      <DialogContent aria-describedby="reject-description">
        <DialogTitle>Reject application</DialogTitle>
        <DialogDescription id="reject-description">
          Record an internal rejection outcome. Talent Pool placement is
          optional.
        </DialogDescription>
        <div className="mt-4 grid gap-4">
          <Field id="rejection-reason" label="Rejection reason" required>
            {() => (
              <Select
                id="rejection-reason"
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value as typeof reason)
                }
              >
                {reasons.map((x) => (
                  <option key={x} value={x}>
                    {x.replaceAll('_', ' ')}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {canSelectPool ? (
            <Field id="rejection-talent-pool" label="Talent Pool">
              {() => (
                <Select
                  id="rejection-talent-pool"
                  value={talentPoolId}
                  onChange={(event) => setTalentPoolId(event.target.value)}
                >
                  <option value="">Do not add to Talent Pool</option>
                  {pools.data?.pools.map((pool) => (
                    <option key={pool.id} value={pool.id}>
                      {pool.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
          <Field id="rejection-details" label="Details">
            {() => (
              <Textarea
                id="rejection-details"
                value={details}
                maxLength={1000}
                onChange={(e) => setDetails(e.target.value)}
              />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={mutation.isPending}
              onClick={() =>
                mutation.mutate(
                  {
                    action: 'reject',
                    body: {
                      expectedRevision: revision,
                      reasonCode: reason,
                      ...(details.trim()
                        ? { reasonDetails: details.trim() }
                        : {}),
                      ...(talentPoolId ? { talentPoolId } : {}),
                    },
                  },
                  { onSuccess: onClose },
                )
              }
            >
              Reject application
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
function ReopenDialog({
  revision,
  mutation,
  onClose,
}: {
  revision: number
  mutation: ReturnType<typeof useOfferActions>['outcome']
  onClose: () => void
}) {
  const [details, setDetails] = useState('')
  return (
    <Dialog open onOpenChange={(x) => !x && !mutation.isPending && onClose()}>
      <DialogContent aria-describedby="reopen-description">
        <DialogTitle>Reopen application</DialogTitle>
        <DialogDescription id="reopen-description">
          Explain why this application is returning to active status.
        </DialogDescription>
        <div className="mt-4 grid gap-4">
          <Field id="reopen-details" label="Reason" required>
            {() => (
              <Textarea
                id="reopen-details"
                value={details}
                maxLength={1000}
                onChange={(e) => setDetails(e.target.value)}
              />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!details.trim()}
              loading={mutation.isPending}
              onClick={() =>
                mutation.mutate(
                  {
                    action: 'reopen',
                    body: {
                      expectedRevision: revision,
                      reasonDetails: details.trim(),
                    },
                  },
                  { onSuccess: onClose },
                )
              }
            >
              Reopen application
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
