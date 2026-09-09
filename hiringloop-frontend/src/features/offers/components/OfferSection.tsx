import { useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  Input,
  Textarea,
} from '../../../shared/components/ui'
import { ConfirmDialog } from '../../team/components/ConfirmDialog'
import { isApiError } from '../../../shared/lib/apiErrors'
import { useOffer } from '../hooks/queries'
import { useOfferActions } from '../hooks/mutations'
import type { OfferDto, OfferTermsInput } from '../types/offers.types'
const card = 'rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6'
const blank: OfferTermsInput = {
  jobTitle: '',
  currency: 'USD',
  baseCompensationMinor: '',
}
export function OfferSection({
  organizationId,
  applicationId,
  permissions,
}: {
  organizationId: string
  applicationId: string
  permissions: readonly string[]
}) {
  const allowed = permissions.includes('offer:view')
  const manage = permissions.includes('offer:create')
  const q = useOffer(organizationId, applicationId, allowed)
  const actions = useOfferActions(organizationId, applicationId)
  const [form, setForm] = useState<'create' | 'edit' | 'revise' | null>(null)
  const [confirm, setConfirm] = useState<
    'send' | 'accept' | 'decline' | 'withdraw' | null
  >(null)
  if (!allowed) return null
  const offer = q.data
  return (
    <section className={card}>
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Offer</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Confidential terms for this application.
          </p>
        </div>
        {!q.isPending && !offer && manage ? (
          <Button onClick={() => setForm('create')}>Create offer</Button>
        ) : null}
      </div>
      {q.isPending ? (
        <p className="mt-4 text-sm" aria-busy="true">
          Loading offer…
        </p>
      ) : q.isError ? (
        <p role="alert" className="mt-4 text-sm text-error">
          Offer unavailable.{' '}
          {isApiError(q.error) && q.error.status === 404
            ? 'No offer has been created.'
            : ''}
        </p>
      ) : !offer ? (
        <p className="mt-4 text-sm text-text-secondary">No offer created.</p>
      ) : (
        <OfferDetails
          offer={offer}
          manage={manage}
          delivery={actions.send.data?.status}
          onForm={setForm}
          onConfirm={setConfirm}
        />
      )}{' '}
      {form ? (
        <OfferForm
          mode={form}
          offer={offer}
          actions={actions}
          onClose={() => setForm(null)}
        />
      ) : null}
      {confirm && offer ? (
        <ConfirmDialog
          title={`${confirm[0].toUpperCase() + confirm.slice(1)} offer?`}
          description={
            confirm === 'accept'
              ? 'Record this offer as accepted internally. This does not represent an online candidate action.'
              : confirm === 'withdraw'
                ? 'Withdraw this offer. Historical terms remain available read-only.'
                : 'Confirm this offer action.'
          }
          confirmLabel={confirm === 'send' ? 'Send offer' : `Record ${confirm}`}
          danger={confirm === 'withdraw'}
          busy={
            confirm === 'send'
              ? actions.send.isPending
              : actions.transition.isPending
          }
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm === 'send')
              actions.send.mutate(
                {
                  id: offer.id,
                  expectedRevision: offer.revision,
                  idempotencyKey: crypto.randomUUID(),
                },
                { onSuccess: () => setConfirm(null) },
              )
            else
              actions.transition.mutate(
                {
                  id: offer.id,
                  action: confirm,
                  expectedRevision: offer.revision,
                },
                { onSuccess: () => setConfirm(null) },
              )
          }}
        />
      ) : null}
    </section>
  )
}
function OfferDetails({
  offer,
  manage,
  delivery,
  onForm,
  onConfirm,
}: {
  offer: OfferDto
  manage: boolean
  delivery: 'PENDING' | 'SENT' | 'FAILED' | undefined
  onForm: (x: 'edit' | 'revise') => void
  onConfirm: (x: 'send' | 'accept' | 'decline' | 'withdraw') => void
}) {
  const v = offer.currentVersion
  if (!v) return null
  const money = (minor: string, currency: string) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(BigInt(minor))
    } catch {
      return `${minor} ${currency} (minor units)`
    }
  }
  return (
    <div className="mt-5">
      <div className="flex flex-wrap justify-between gap-2">
        <p className="font-semibold">
          Version {v.versionNumber} ·{' '}
          <Badge
            variant={
              offer.status === 'ACCEPTED'
                ? 'success'
                : offer.status === 'DECLINED' || offer.status === 'WITHDRAWN'
                  ? 'danger'
                  : 'warning'
            }
          >
            {offer.status}
          </Badge>
        </p>
        <div className="flex flex-wrap gap-2">
          {manage && offer.status === 'DRAFT' ? (
            <>
              <Button variant="secondary" onClick={() => onForm('edit')}>
                Edit draft
              </Button>
              <Button onClick={() => onConfirm('send')}>Send offer</Button>
            </>
          ) : null}
          {manage && offer.status === 'SENT' ? (
            <>
              <Button variant="secondary" onClick={() => onForm('revise')}>
                New revision
              </Button>
              {!v.issuedAt ? (
                <Button onClick={() => onConfirm('send')}>
                  Send revised offer
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => onConfirm('accept')}
                  >
                    Record accepted
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => onConfirm('decline')}
                  >
                    Record declined
                  </Button>
                </>
              )}
            </>
          ) : null}
          {manage && ['DRAFT', 'SENT'].includes(offer.status) ? (
            <Button variant="danger" onClick={() => onConfirm('withdraw')}>
              Withdraw
            </Button>
          ) : null}
        </div>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <Info label="Job title" value={v.jobTitle} />
        <Info label="Offer status" value={offer.status} />
        <Info
          label="Last issued"
          value={
            v.issuedAt ? new Date(v.issuedAt).toLocaleString() : 'Not issued'
          }
        />
        <Info
          label="Base compensation"
          value={money(v.baseCompensationMinor, v.currency)}
        />
        {v.bonusCompensationMinor ? (
          <Info
            label="Bonus"
            value={money(v.bonusCompensationMinor, v.currency)}
          />
        ) : null}
        <Info
          label="Start date"
          value={
            v.startDate
              ? new Date(v.startDate).toLocaleDateString()
              : 'Not specified'
          }
        />
        <Info
          label="Expiration"
          value={
            v.expirationDate
              ? new Date(v.expirationDate).toLocaleDateString()
              : 'Not specified'
          }
        />
        <Info
          label="Location"
          value={
            [v.location, v.workplaceType].filter(Boolean).join(' · ') ||
            'Not specified'
          }
        />
      </dl>
      <div className="mt-4 text-sm">
        <p className="font-semibold">Communication delivery</p>
        {delivery ? (
          <Badge
            variant={
              delivery === 'SENT'
                ? 'success'
                : delivery === 'FAILED'
                  ? 'danger'
                  : 'warning'
            }
          >
            {delivery === 'PENDING'
              ? 'PENDING · delivery unconfirmed'
              : delivery}
          </Badge>
        ) : (
          <p className="mt-1 text-text-secondary">
            See Communication history for delivery status.
          </p>
        )}
        {delivery === 'PENDING' ? (
          <p className="mt-1 text-text-secondary">
            The offer is sent, but email delivery has not been confirmed.
          </p>
        ) : null}
        {delivery === 'FAILED' ? (
          <p className="mt-1 text-error">
            The offer remains sent, but its delivery failed. See Communication
            history.
          </p>
        ) : null}
      </div>
      {offer.versions && offer.versions.length > 1 ? (
        <p className="mt-4 text-sm text-text-secondary">
          Previous issued terms are retained as historical versions.
        </p>
      ) : null}
    </div>
  )
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd className="break-words font-semibold">{value}</dd>
    </div>
  )
}
function OfferForm({
  mode,
  offer,
  actions,
  onClose,
}: {
  mode: 'create' | 'edit' | 'revise'
  offer: OfferDto | undefined
  actions: ReturnType<typeof useOfferActions>
  onClose: () => void
}) {
  const v = offer?.currentVersion
  const [input, setInput] = useState<OfferTermsInput>(
    v
      ? {
          jobTitle: v.jobTitle,
          currency: v.currency,
          baseCompensationMinor: v.baseCompensationMinor,
          bonusCompensationMinor: v.bonusCompensationMinor ?? undefined,
          additionalCompensationText: v.additionalCompensationText ?? undefined,
          startDate: v.startDate?.slice(0, 10),
          expirationDate: v.expirationDate?.slice(0, 10),
          location: v.location ?? undefined,
          workplaceType: v.workplaceType ?? undefined,
          additionalTerms: v.additionalTerms ?? undefined,
        }
      : blank,
  )
  const bad =
    !input.jobTitle.trim() ||
    !/^[A-Z]{3}$/.test(input.currency) ||
    !/^\d+$/.test(input.baseCompensationMinor)
  const m =
    mode === 'create'
      ? actions.create
      : mode === 'edit'
        ? actions.edit
        : actions.revise
  const submit = () => {
    if (bad || m.isPending) return
    const clean = Object.fromEntries(
      Object.entries(input).filter(([, x]) => x !== undefined && x !== ''),
    ) as OfferTermsInput
    if (mode === 'create') actions.create.mutate(clean, { onSuccess: onClose })
    else
      m.mutate(
        { ...clean, id: offer!.id, expectedRevision: offer!.revision } as never,
        { onSuccess: onClose },
      )
  }
  return (
    <Dialog open onOpenChange={(x) => !x && !m.isPending && onClose()}>
      <DialogContent
        aria-describedby="offer-form-description"
        className="max-w-2xl"
      >
        <DialogTitle>
          {mode === 'create'
            ? 'Create offer'
            : mode === 'edit'
              ? 'Edit draft offer'
              : 'Create offer revision'}
        </DialogTitle>
        <DialogDescription id="offer-form-description">
          {mode === 'revise'
            ? 'This creates a new version; issued terms remain historical.'
            : 'Enter the offer terms in minor currency units.'}
        </DialogDescription>
        <div className="mt-4 grid gap-4">
          <Field id="offer-title" label="Job title" required>
            {() => (
              <Input
                id="offer-title"
                value={input.jobTitle}
                onChange={(e) =>
                  setInput({ ...input, jobTitle: e.target.value })
                }
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="offer-currency" label="Currency" required>
              {() => (
                <Input
                  id="offer-currency"
                  maxLength={3}
                  value={input.currency}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      currency: e.target.value.toUpperCase(),
                    })
                  }
                />
              )}
            </Field>
            <Field
              id="offer-base"
              label="Base compensation (minor units)"
              required
            >
              {() => (
                <Input
                  id="offer-base"
                  inputMode="numeric"
                  value={input.baseCompensationMinor}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      baseCompensationMinor: e.target.value,
                    })
                  }
                />
              )}
            </Field>
          </div>
          <Field id="offer-bonus" label="Bonus (minor units)">
            {() => (
              <Input
                id="offer-bonus"
                inputMode="numeric"
                value={input.bonusCompensationMinor ?? ''}
                onChange={(e) =>
                  setInput({
                    ...input,
                    bonusCompensationMinor: e.target.value || undefined,
                  })
                }
              />
            )}
          </Field>
          <Field id="offer-location" label="Location">
            {() => (
              <Input
                id="offer-location"
                value={input.location ?? ''}
                onChange={(e) =>
                  setInput({ ...input, location: e.target.value || undefined })
                }
              />
            )}
          </Field>
          <Field id="offer-terms" label="Additional terms">
            {() => (
              <Textarea
                id="offer-terms"
                value={input.additionalTerms ?? ''}
                onChange={(e) =>
                  setInput({
                    ...input,
                    additionalTerms: e.target.value || undefined,
                  })
                }
              />
            )}
          </Field>
          {m.isError ? (
            <p role="alert" className="text-sm text-error">
              {isApiError(m.error) && m.error.status === 409
                ? 'This offer changed elsewhere. Reload the latest version before continuing.'
                : 'We could not save this offer.'}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={m.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button loading={m.isPending} disabled={bad} onClick={submit}>
              Save offer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
