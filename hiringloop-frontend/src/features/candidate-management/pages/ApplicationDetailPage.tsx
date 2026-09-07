import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ErrorState,
  EmptyState,
  LoadingState,
} from '../../../shared/components/feedback'
import { Badge, Button, PageHeader } from '../../../shared/components/ui'
import { isApiError } from '../../../shared/lib/apiErrors'
import { useOrganization } from '../../organizations/hooks/queries'
import { useDocumentAccess } from '../hooks/mutations'
import { useApplication } from '../hooks/queries'
import type {
  ApplicationDetailDto,
  ApplicationDocumentDto,
  ApplicationAnswerDto,
} from '../types/candidate-management.types'
import {
  canReadCandidates,
  candidateError,
  documentAccessError,
  formatAnswer,
  formatCandidateDate,
  safeHttpUrl,
} from '../utils/candidate-management-utils'

export function ApplicationDetailPage() {
  const { organizationId = '', applicationId = '' } = useParams()
  const organization = useOrganization(organizationId, Boolean(organizationId))
  const mayRead = canReadCandidates(organization.data?.permissions)
  const application = useApplication(
    organizationId,
    applicationId,
    Boolean(organizationId && applicationId && mayRead),
  )
  const documentAccess = useDocumentAccess(organizationId)

  if (organization.isPending)
    return <LoadingState label="Checking application access" />
  if (organization.isError || !mayRead)
    return (
      <Wrap>
        <ErrorState
          title="Candidate access unavailable"
          description="You do not have permission to view applications in this workspace."
        />
      </Wrap>
    )
  if (application.isPending) return <LoadingState label="Loading application" />
  if (application.isError) {
    const notFound =
      isApiError(application.error) && application.error.status === 404
    return (
      <Wrap>
        <ErrorState
          title={notFound ? 'Application not found' : undefined}
          description={candidateError(
            application.error,
            'We could not load this application.',
          )}
          onRetry={notFound ? undefined : () => void application.refetch()}
        />
      </Wrap>
    )
  }
  if (!application.data)
    return (
      <Wrap>
        <ErrorState
          title="Application not found"
          description="This application is no longer available."
        />
      </Wrap>
    )

  return (
    <ApplicationContent
      application={application.data}
      organizationId={organizationId}
      documentAccess={documentAccess}
    />
  )
}

function ApplicationContent({
  application,
  organizationId,
  documentAccess,
}: {
  application: ApplicationDetailDto
  organizationId: string
  documentAccess: ReturnType<typeof useDocumentAccess>
}) {
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(
    null,
  )
  async function openDocument(document: ApplicationDocumentDto) {
    if (documentAccess.isPending) return
    setOpeningDocumentId(document.id)
    try {
      const result = await documentAccess.mutateAsync(document.id)
      window.open(result.url, '_blank', 'noopener,noreferrer')
    } catch {
      // The mutation error is shown in the document section.
    } finally {
      setOpeningDocumentId(null)
      // Do not retain the short-lived signed URL in the mutation cache.
      documentAccess.reset()
    }
  }

  return (
    <Wrap>
      <PageHeader
        title={application.job.title}
        description={`Application submitted ${formatCandidateDate(application.submittedAt)}`}
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <div className="grid gap-6">
          <Section title="Candidate">
            <dl className="grid gap-5 sm:grid-cols-2">
              <Meta label="Name" value={application.candidate.name} />
              <Meta label="Email" value={application.candidate.email} />
              <Meta
                label="Phone"
                value={application.candidate.phone ?? 'Not provided'}
              />
            </dl>
            <Link
              className="mt-5 inline-block font-bold text-primary-dark hover:underline"
              to={`/app/organizations/${organizationId}/candidates/${application.candidate.id}`}
            >
              View candidate profile
            </Link>
          </Section>
          <Section title="Job">
            <Link
              className="font-bold text-primary-dark hover:underline"
              to={`/app/organizations/${organizationId}/jobs/${application.job.id}`}
            >
              {application.job.title}
            </Link>
          </Section>
          <Section title="Submitted application answers">
            {application.answers.length ? (
              <div className="grid gap-5">
                {application.answers.map((answer) => (
                  <Answer key={answer.question.id} answer={answer} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                No custom answers were submitted.
              </p>
            )}
          </Section>
        </div>
        <div className="grid content-start gap-6">
          <Section title="Current stage">
            <Badge variant="success">
              {application.currentStage?.name ?? 'Stage unavailable'}
            </Badge>
          </Section>
          <Section title="Resume and documents">
            {documentAccess.isError ? (
              <p
                className="mb-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                role="alert"
              >
                {documentAccessError(documentAccess.error)}
              </p>
            ) : null}
            {application.documents.length ? (
              <div className="grid gap-4">
                {application.documents.map((document) => (
                  <DocumentRow
                    key={document.id}
                    document={document}
                    busy={openingDocumentId === document.id}
                    onOpen={() => void openDocument(document)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No documents"
                description="No resume or other documents were submitted."
              />
            )}
          </Section>
          <Section title="Stage history">
            {application.stageHistory.length ? (
              <ol className="grid gap-4">
                {application.stageHistory.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-primary pl-4">
                    <p className="font-semibold">
                      {entry.fromStage?.name ?? 'Application'} →{' '}
                      {entry.toStage?.name ?? 'Stage unavailable'}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {formatEvent(entry.event)} ·{' '}
                      {formatCandidateDate(entry.occurredAt)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-text-secondary">
                No stage history is available.
              </p>
            )}
          </Section>
        </div>
      </div>
    </Wrap>
  )
}

function Answer({ answer }: { answer: ApplicationAnswerDto }) {
  const url =
    answer.question.type === 'URL' ? safeHttpUrl(answer.value) : undefined
  const value = formatAnswer(answer)
  return (
    <div className="min-w-0 border-b border-border pb-4 last:border-b-0 last:pb-0">
      <p className="font-semibold">{answer.question.label}</p>
      <div className="mt-1 break-words text-text-secondary">
        {url ? (
          <a
            className="break-all text-primary-dark underline"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {url}
          </a>
        ) : (
          <span
            className={
              answer.question.type === 'LONG_TEXT'
                ? 'whitespace-pre-wrap'
                : undefined
            }
          >
            {value}
          </span>
        )}
      </div>
    </div>
  )
}

function DocumentRow({
  document,
  busy,
  onOpen,
}: {
  document: ApplicationDocumentDto
  busy: boolean
  onOpen: () => void
}) {
  return (
    <div className="min-w-0 rounded-control border border-border p-3">
      <p className="truncate font-semibold" title={document.fileName}>
        {document.fileName}
      </p>
      <p className="mt-1 break-words text-sm text-text-secondary">
        {document.type} · {document.contentType} ·{' '}
        {formatCandidateDate(document.createdAt)}
      </p>
      <Button
        className="mt-3 w-full"
        variant="secondary"
        loading={busy}
        onClick={onOpen}
      >
        {busy
          ? 'Opening…'
          : document.type === 'RESUME'
            ? 'View / download resume'
            : 'View / download'}
      </Button>
    </div>
  )
}

function formatEvent(event: string) {
  return event.toLowerCase().replaceAll('_', ' ')
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="mb-5 text-lg font-bold">{title}</h2>
      {children}
    </section>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-6xl min-w-0 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {children}
    </section>
  )
}
