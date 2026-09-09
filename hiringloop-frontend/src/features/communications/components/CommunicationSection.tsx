import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  Input,
  Textarea,
  Badge,
} from '../../../shared/components/ui'
import { EmptyState, ErrorState } from '../../../shared/components/feedback'
import { isApiError } from '../../../shared/lib/apiErrors'
import { useCommunicationTemplates, useCommunications } from '../hooks/queries'
import { useSendCommunication, useTemplateMutations } from '../hooks/mutations'
import type { CommunicationTemplateDto } from '../types/communications.types'

const card = 'rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6'
const uuid = () => crypto.randomUUID()

export function CommunicationSection({
  organizationId,
  applicationId,
  candidateEmail,
  enabled,
}: {
  organizationId: string
  applicationId: string
  candidateEmail: string
  enabled: boolean
}) {
  const [page, setPage] = useState(1)
  const [compose, setCompose] = useState(false)
  const [templateManager, setTemplateManager] = useState(false)
  const history = useCommunications(
    organizationId,
    applicationId,
    page,
    enabled,
  )
  const templates = useCommunicationTemplates(organizationId, enabled)
  if (!enabled) return null
  return (
    <section className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Communication</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Send plain-text email and review delivery history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCompose(true)}>Send Email</Button>
          <Button variant="secondary" onClick={() => setTemplateManager(true)}>
            Manage templates
          </Button>
        </div>
      </div>
      {history.isPending ? (
        <p className="mt-5 text-sm" aria-busy="true">
          Loading communication history…
        </p>
      ) : history.isError ? (
        <div className="mt-4">
          <ErrorState
            title="Communication history unavailable"
            description="We could not load candidate communications."
            onRetry={() => void history.refetch()}
          />
        </div>
      ) : history.data?.data.length ? (
        <div className="mt-5 grid gap-4">
          {history.data.data.map((item) => (
            <CommunicationItem key={item.id} item={item} />
          ))}
          <Pagination
            page={page}
            hasNext={
              history.data.data.length === history.data.pagination.pageSize
            }
            onChange={setPage}
          />
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="No candidate communications yet"
            description="Sent candidate emails will appear here."
          />
        </div>
      )}
      {compose ? (
        <SendEmailDialog
          candidateEmail={candidateEmail}
          templates={templates.data?.data ?? []}
          onClose={() => setCompose(false)}
          organizationId={organizationId}
          applicationId={applicationId}
        />
      ) : null}
      {templateManager ? (
        <TemplateManager
          organizationId={organizationId}
          templates={templates.data?.data ?? []}
          loading={templates.isPending}
          error={templates.isError}
          onRetry={() => void templates.refetch()}
          onClose={() => setTemplateManager(false)}
        />
      ) : null}
    </section>
  )
}

function CommunicationItem({
  item,
}: {
  item: import('../types/communications.types').CommunicationDto
}) {
  const variant =
    item.status === 'SENT'
      ? 'success'
      : item.status === 'FAILED'
        ? 'danger'
        : 'warning'
  return (
    <article className="rounded-control border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{item.subject}</h3>
          <p className="mt-1 text-sm text-text-secondary">
            To {item.recipientEmail} · {item.sender?.email ?? 'HiringLoop'} ·{' '}
            {new Date(item.createdAt).toLocaleString()}
          </p>
        </div>
        <Badge variant={variant}>
          {item.status === 'PENDING'
            ? 'PENDING · status unconfirmed'
            : item.status}
        </Badge>
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm">
        {item.body}
      </p>
      {item.status === 'FAILED' ? (
        <p className="mt-2 text-sm text-error">
          This email could not be delivered. Review the message before trying
          again.
        </p>
      ) : null}
      {item.status === 'PENDING' ? (
        <p className="mt-2 text-sm text-amber-800">
          Delivery status could not be confirmed. Do not resend immediately.
        </p>
      ) : null}
    </article>
  )
}
function Pagination({
  page,
  hasNext,
  onChange,
}: {
  page: number
  hasNext: boolean
  onChange: (page: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-text-secondary">Page {page}</span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={!hasNext}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function SendEmailDialog({
  candidateEmail,
  templates,
  organizationId,
  applicationId,
  onClose,
}: {
  candidateEmail: string
  templates: readonly CommunicationTemplateDto[]
  organizationId: string
  applicationId: string
  onClose: () => void
}) {
  const [subject, setSubject] = useState(''),
    [body, setBody] = useState(''),
    [attemptKey] = useState(uuid),
    [templateId, setTemplateId] = useState('')
  const send = useSendCommunication(organizationId, applicationId)
  const subjectError = !subject.trim()
    ? 'Subject is required.'
    : subject.length > 998
      ? 'Subject must be 998 characters or fewer.'
      : undefined
  const bodyError = !body.trim()
    ? 'Message is required.'
    : body.length > 100000
      ? 'Message must be 100,000 characters or fewer.'
      : undefined
  const submit = () => {
    if (subjectError || bodyError || send.isPending) return
    send.mutate(
      {
        subject: subject.trim(),
        body: body.trim(),
        idempotencyKey: attemptKey,
      },
      { onSuccess: onClose },
    )
  }
  return (
    <Dialog open onOpenChange={(open) => !open && !send.isPending && onClose()}>
      <DialogContent
        aria-describedby="send-email-description"
        className="max-w-2xl"
      >
        <DialogTitle>Send Email</DialogTitle>
        <DialogDescription id="send-email-description">
          Send a plain-text message to this candidate.
        </DialogDescription>
        <div className="mt-5 grid gap-4">
          <Field
            id="recipient"
            label="To"
            helperText="The candidate address is authoritative and cannot be changed."
          >
            {({ describedBy }) => (
              <Input
                id="recipient"
                value={candidateEmail}
                readOnly
                aria-readonly="true"
                aria-describedby={describedBy}
              />
            )}
          </Field>
          {templates.length ? (
            <Field id="email-template" label="Use template">
              {() => (
                <select
                  id="email-template"
                  className="h-11 rounded-control border border-border bg-surface px-3"
                  value={templateId}
                  onChange={(e) => {
                    const t = templates.find((x) => x.id === e.target.value)
                    setTemplateId(e.target.value)
                    if (t) {
                      setSubject(t.subject)
                      setBody(t.body)
                    }
                  }}
                >
                  <option value="">No template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          ) : null}
          <Field id="subject" label="Subject" required error={subjectError}>
            {({ describedBy, invalid }) => (
              <Input
                id="subject"
                value={subject}
                maxLength={998}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                onChange={(e) => setSubject(e.target.value)}
              />
            )}
          </Field>
          <Field id="message" label="Message" required error={bodyError}>
            {({ describedBy, invalid }) => (
              <Textarea
                id="message"
                value={body}
                maxLength={100000}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                onChange={(e) => setBody(e.target.value)}
              />
            )}
          </Field>
          {send.isError ? (
            <p role="alert" className="text-sm text-error">
              {isApiError(send.error) && send.error.status === 502
                ? 'The email could not be delivered. Your message is still here for review.'
                : 'We could not send this email. Please try again.'}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={send.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button loading={send.isPending} onClick={submit}>
              {send.isPending ? 'Sending email…' : 'Send email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TemplateManager({
  organizationId,
  templates,
  loading,
  error,
  onRetry,
  onClose,
}: {
  organizationId: string
  templates: readonly CommunicationTemplateDto[]
  loading: boolean
  error: boolean
  onRetry: () => void
  onClose: () => void
}) {
  const [editing, setEditing] = useState<CommunicationTemplateDto | null>(null),
    [creating, setCreating] = useState(false),
    [deleting, setDeleting] = useState<CommunicationTemplateDto | null>(null)
  const mutations = useTemplateMutations(organizationId)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        aria-describedby="templates-description"
        className="max-w-2xl"
      >
        <DialogTitle>Communication templates</DialogTitle>
        <DialogDescription id="templates-description">
          Reusable plain-text messages. Selecting one never sends it
          automatically.
        </DialogDescription>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setCreating(true)}>New template</Button>
        </div>
        {loading ? (
          <p className="mt-4 text-sm">Loading templates…</p>
        ) : error ? (
          <ErrorState title="Templates unavailable" onRetry={onRetry} />
        ) : templates.length ? (
          <div className="mt-4 grid gap-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{t.name}</p>
                  <p className="truncate text-sm text-text-secondary">
                    {t.subject}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setEditing(t)}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => setDeleting(t)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No templates yet"
            description="Create a reusable message for common candidate updates."
          />
        )}
        {creating || editing ? (
          <TemplateForm
            organizationId={organizationId}
            template={editing}
            mutation={editing ? mutations.update : mutations.create}
            onClose={() => {
              setCreating(false)
              setEditing(null)
            }}
          />
        ) : null}
        {deleting ? (
          <Dialog open onOpenChange={(open) => !open && setDeleting(null)}>
            <DialogContent aria-describedby="delete-template-description">
              <DialogTitle>Delete template?</DialogTitle>
              <DialogDescription id="delete-template-description">
                This removes only the reusable template. Historical emails are
                unchanged.
              </DialogDescription>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDeleting(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  loading={mutations.remove.isPending}
                  onClick={() =>
                    mutations.remove.mutate(deleting.id, {
                      onSuccess: () => setDeleting(null),
                    })
                  }
                >
                  Delete template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
function TemplateForm({
  template,
  mutation,
  onClose,
}: {
  organizationId: string
  template: CommunicationTemplateDto | null
  mutation:
    | ReturnType<typeof useTemplateMutations>['create']
    | ReturnType<typeof useTemplateMutations>['update']
  onClose: () => void
}) {
  const [name, setName] = useState(template?.name ?? ''),
    [subject, setSubject] = useState(template?.subject ?? ''),
    [body, setBody] = useState(template?.body ?? '')
  const error = !name.trim() || !subject.trim() || !body.trim()
  const submit = () => {
    if (error) return
    const input = {
      name: name.trim(),
      subject: subject.trim(),
      body: body.trim(),
      ...(template
        ? { id: template.id, expectedRevision: template.revision }
        : {}),
    }
    mutation.mutate(input as never, { onSuccess: onClose })
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby="template-form-description">
        <DialogTitle>{template ? 'Edit template' : 'New template'}</DialogTitle>
        <DialogDescription id="template-form-description">
          Keep templates short, clear, and plain text.
        </DialogDescription>
        <div className="mt-4 grid gap-4">
          <Field id="template-name" label="Name" required>
            {() => (
              <Input
                id="template-name"
                value={name}
                maxLength={160}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>
          <Field id="template-subject" label="Subject" required>
            {() => (
              <Input
                id="template-subject"
                value={subject}
                maxLength={998}
                onChange={(e) => setSubject(e.target.value)}
              />
            )}
          </Field>
          <Field id="template-body" label="Message" required>
            {() => (
              <Textarea
                id="template-body"
                value={body}
                maxLength={100000}
                onChange={(e) => setBody(e.target.value)}
              />
            )}
          </Field>
          {mutation.isError ? (
            <p role="alert" className="text-sm text-error">
              {isApiError(mutation.error) && mutation.error.status === 409
                ? 'This template changed elsewhere. Close this form and reload the latest version.'
                : 'We could not save this template.'}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              loading={mutation.isPending}
              disabled={error}
              onClick={submit}
            >
              Save template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
