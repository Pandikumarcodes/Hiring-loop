import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageContainer,
  PageHeader,
  Select,
  Textarea,
} from '../../../shared/components/ui'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../shared/components/feedback'
import { isApiError } from '../../../shared/lib/apiErrors'
import { useOrganization } from '../../organizations/hooks/queries'
import { useJob } from '../../jobs/hooks/queries'
import { jobRoutes } from '../../jobs/utils/job-routes'
import { jobTitle } from '../../jobs/utils/job-utils'
import { ConfirmDialog } from '../../team/components/ConfirmDialog'
import {
  useCreateDraft,
  usePublishDraft,
  useUpdateDraft,
} from '../hooks/mutations'
import { useScorecardTemplate } from '../hooks/queries'
import type { CriterionInput, TemplateVersion } from '../types/scorecard.types'

const blank = (): CriterionInput => ({
  label: '',
  description: null,
  type: 'RATING',
  required: true,
  position: 1,
})

export function ScorecardTemplatePage() {
  const { organizationId = '', jobId = '' } = useParams()
  const organization = useOrganization(organizationId, Boolean(organizationId))
  const canManage =
    organization.data?.permissions?.includes('scorecard-template:manage') ??
    false
  const canView =
    organization.data?.permissions?.includes('scorecard-template:view') ?? false
  const query = useScorecardTemplate(
    organizationId,
    jobId,
    Boolean(organizationId && jobId && canView),
  )
  const job = useJob(
    organizationId,
    jobId,
    Boolean(
      organizationId &&
        jobId &&
        canView &&
        organization.data?.permissions?.includes('job:read'),
    ),
  )
  const create = useCreateDraft(organizationId, jobId)
  const update = useUpdateDraft(organizationId, jobId)
  const publish = usePublishDraft(organizationId, jobId)
  const [publishing, setPublishing] = useState<number | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)
  const conflict = [update.error, publish.error].some(
    (error) => isApiError(error) && error.status === 409,
  )
  if (organization.isPending)
    return <LoadingState label="Checking scorecard access" />
  if (organization.isError)
    return (
      <PageContainer width="standard">
        <ErrorState
          title="Workspace unavailable"
          description="We could not check scorecard access."
          onRetry={() => void organization.refetch()}
        />
      </PageContainer>
    )
  if (!canView)
    return (
      <PageContainer width="standard">
        <ErrorState
          title="Scorecard unavailable"
          description="You do not have permission to view this scorecard."
        />
      </PageContainer>
    )
  if (query.isPending)
    return <LoadingState label="Loading scorecard configuration" />
  if (query.isError)
    return (
      <PageContainer width="standard">
        <ErrorState
          title="Scorecard unavailable"
          description="We could not load this scorecard template."
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    )
  const template = query.data
  const breadcrumb = (
    <Link
      className="font-semibold text-text-secondary hover:text-primary-dark hover:underline"
      to={jobRoutes.detail(organizationId, jobId)}
    >
      {job.data ? jobTitle(job.data.title) : 'Job detail'}
    </Link>
  )
  if (!template)
    return (
      <PageContainer width="standard">
        <PageHeader
          breadcrumbs={breadcrumb}
          title="Scorecard template"
          description="Configure structured interview evaluation for this job."
        />
        <Card className="p-6">
          <EmptyState
            title="No scorecard configured"
            description="No scorecard has been configured for this job."
          />
          {canManage ? (
            <Button
              className="mt-4"
              loading={create.isPending}
              onClick={() => create.mutate(undefined)}
            >
              Create Scorecard
            </Button>
          ) : null}
          {create.isError ? (
            <p role="alert" className="mt-3 text-sm text-error">
              We could not create a scorecard draft.
            </p>
          ) : null}
        </Card>
      </PageContainer>
    )
  return (
    <PageContainer width="standard">
      <PageHeader
        breadcrumbs={breadcrumb}
        title="Scorecard template"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Structured interview evaluation form{' '}
            <Badge variant={template.draft ? 'warning' : 'success'}>
              {template.draft ? 'Draft available' : 'Published'}
            </Badge>
          </span>
        }
      />
      <Card className="p-5 sm:p-6">
        {template.activeVersion ? (
          <Version version={template.activeVersion} label="Published" />
        ) : null}
        {template.draft && canManage ? (
          <Editor
            key={`${template.draft.id}-${reloadVersion}`}
            version={template.draft}
            busy={update.isPending || publish.isPending}
            conflict={conflict}
            failed={Boolean(update.error || publish.error)}
            reload={() => {
              void query.refetch().then((result) => {
                if (!result.isSuccess) return
                update.reset()
                publish.reset()
                setReloadVersion((value) => value + 1)
              })
            }}
            save={(value, onSaved) =>
              update.mutate(value, {
                onSuccess: (result) => {
                  if (result.draft) onSaved(result.draft)
                },
              })
            }
            publish={(revision) => setPublishing(revision)}
          />
        ) : null}
        {!template.draft && canManage && template.activeVersion ? (
          <Button
            className="mt-5"
            loading={create.isPending}
            onClick={() => create.mutate(undefined)}
          >
            Create New Draft
          </Button>
        ) : null}
        {create.isError ? (
          <p role="alert" className="mt-3 text-sm text-error">
            We could not create a scorecard draft.
          </p>
        ) : null}
      </Card>
      {publishing !== null && template.draft ? (
        <ConfirmDialog
          title="Publish scorecard?"
          description="Published scorecard versions are immutable."
          confirmLabel="Publish"
          busy={publish.isPending}
          onCancel={() => setPublishing(null)}
          onConfirm={() => {
            if (!publish.isPending)
              publish.mutate(
                { expectedRevision: publishing },
                { onSuccess: () => setPublishing(null) },
              )
          }}
        />
      ) : null}
    </PageContainer>
  )
}

function Version({
  version,
  label,
}: {
  version: TemplateVersion
  label: string
}) {
  return (
    <section className="mb-6 border-b border-border pb-6">
      <Badge variant="success">
        {label} v{version.versionNumber}
      </Badge>
      <h2 className="mt-3 text-lg font-bold">{version.title}</h2>
      {version.instructions ? (
        <p className="mt-2 whitespace-pre-wrap text-text-secondary">
          {version.instructions}
        </p>
      ) : null}
      <ol className="mt-4 grid gap-3">
        {[...version.criteria]
          .sort((a, b) => a.position - b.position)
          .map((criterion) => (
            <li
              key={criterion.id}
              className="min-w-0 rounded-control border border-border p-4"
            >
              <strong className="break-words">{criterion.label}</strong>{' '}
              <Badge variant="info">
                {criterion.type === 'RATING' ? 'Rating (1–5)' : 'Text'}
              </Badge>{' '}
              <Badge variant={criterion.required ? 'warning' : 'neutral'}>
                {criterion.required ? 'Required' : 'Optional'}
              </Badge>
              {criterion.description ? (
                <p className="text-sm text-text-secondary">
                  {criterion.description}
                </p>
              ) : null}
            </li>
          ))}
      </ol>
    </section>
  )
}

function Editor({
  version,
  busy,
  conflict,
  failed,
  reload,
  save,
  publish,
}: {
  version: TemplateVersion
  busy: boolean
  conflict: boolean
  failed: boolean
  reload: () => void
  save: (
    value: {
      expectedRevision: number
      title: string
      instructions: string | null
      criteria: readonly CriterionInput[]
    },
    onSaved: (version: TemplateVersion) => void,
  ) => void
  publish: (revision: number) => void
}) {
  const [title, setTitle] = useState(version.title)
  const [baseRevision, setBaseRevision] = useState(version.revision)
  const [saved, setSaved] = useState(false)
  const [instructions, setInstructions] = useState(version.instructions ?? '')
  const [criteria, setCriteria] = useState<CriterionInput[]>(() =>
    version.criteria.map((criterion) => ({ ...criterion })),
  )
  const normalize = (items: CriterionInput[]) =>
    items.map((criterion, index) => ({ ...criterion, position: index + 1 }))
  const patch = (index: number, value: Partial<CriterionInput>) => {
    setSaved(false)
    setCriteria((old) =>
      normalize(
        old.map((criterion, itemIndex) =>
          itemIndex === index ? { ...criterion, ...value } : criterion,
        ),
      ),
    )
  }
  const stale = version.revision !== baseRevision
  const dirty =
    title !== version.title ||
    instructions !== (version.instructions ?? '') ||
    JSON.stringify(criteria) !== JSON.stringify(version.criteria)
  return (
    <section aria-label="Scorecard draft editor">
      <fieldset disabled={busy} className="min-w-0">
        <legend className="sr-only">Edit scorecard draft</legend>
        <Badge>Draft v{version.versionNumber}</Badge>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field id="scorecard-title" label="Title" required>
            {(props) => (
              <Input
                id="scorecard-title"
                value={title}
                maxLength={160}
                aria-describedby={props.describedBy}
                onChange={(event) => {
                  setTitle(event.target.value)
                  setSaved(false)
                }}
              />
            )}
          </Field>
          <Field
            id="scorecard-instructions"
            label="Instructions"
            helperText="Shown to interviewers while completing their scorecard."
          >
            {(props) => (
              <Textarea
                id="scorecard-instructions"
                value={instructions}
                maxLength={10000}
                aria-describedby={props.describedBy}
                onChange={(event) => {
                  setInstructions(event.target.value)
                  setSaved(false)
                }}
              />
            )}
          </Field>
        </div>
        <h2 className="mt-5 text-lg font-bold">Criteria</h2>
        <div className="mt-3 grid gap-4">
          {criteria.map((criterion, index) => (
            <section
              key={`${criterion.id ?? 'new'}-${index}`}
              className="min-w-0 rounded-control border border-border bg-surface p-4 sm:p-5"
            >
              <h3 className="mb-3 text-sm font-semibold text-text-secondary">
                Criterion {index + 1}
              </h3>
              <label className="block font-semibold">
                Label
                <Input
                  value={criterion.label}
                  maxLength={300}
                  onChange={(event) =>
                    patch(index, { label: event.target.value })
                  }
                />
              </label>
              <label className="mt-3 block text-sm font-semibold">
                Description
                <Textarea
                  value={criterion.description ?? ''}
                  maxLength={5000}
                  onChange={(event) =>
                    patch(index, { description: event.target.value || null })
                  }
                />
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <label>
                  Type{' '}
                  <Select
                    value={criterion.type}
                    onChange={(event) =>
                      patch(index, {
                        type: event.target.value as CriterionInput['type'],
                      })
                    }
                  >
                    <option value="RATING">Rating</option>
                    <option value="TEXT">Text</option>
                  </Select>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={criterion.required}
                    onChange={(event) =>
                      patch(index, { required: event.target.checked })
                    }
                  />{' '}
                  Required
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={index === 0}
                  onClick={() =>
                    setCriteria((old) =>
                      normalize(
                        old.map((item, itemIndex) =>
                          itemIndex === index - 1
                            ? old[index]
                            : itemIndex === index
                              ? old[index - 1]
                              : item,
                        ),
                      ),
                    )
                  }
                >
                  Move up
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={index === criteria.length - 1}
                  onClick={() =>
                    setCriteria((old) =>
                      normalize(
                        old.map((item, itemIndex) =>
                          itemIndex === index + 1
                            ? old[index]
                            : itemIndex === index
                              ? old[index + 1]
                              : item,
                        ),
                      ),
                    )
                  }
                >
                  Move down
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() =>
                    setCriteria((old) =>
                      normalize(
                        old.filter((_, itemIndex) => itemIndex !== index),
                      ),
                    )
                  }
                >
                  Delete
                </Button>
              </div>
            </section>
          ))}
        </div>
        <Button
          className="mt-4"
          type="button"
          variant="secondary"
          onClick={() =>
            setCriteria((old) => [
              ...old,
              { ...blank(), position: old.length + 1 },
            ])
          }
        >
          Add criterion
        </Button>
        {conflict ? (
          <div role="alert" className="mt-3 text-sm text-red-800">
            This draft was updated elsewhere. Reload the latest version before
            continuing.{' '}
            <Button type="button" variant="secondary" onClick={reload}>
              Reload latest version
            </Button>
          </div>
        ) : null}
        {stale && !conflict ? (
          <p role="alert" className="mt-3 text-sm text-error">
            A newer draft is available. Reload it before saving or publishing.
          </p>
        ) : null}
        {saved ? (
          <p role="status" className="mt-3 text-sm text-success">
            Scorecard draft saved.
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
          {failed && !conflict ? (
            <p role="alert" className="text-sm text-red-800">
              We could not save or publish this scorecard. Review the form and
              try again.
            </p>
          ) : null}
          <Button
            loading={busy}
            disabled={busy || !title.trim() || stale || conflict}
            onClick={() =>
              save(
                {
                  expectedRevision: baseRevision,
                  title: title.trim(),
                  instructions: instructions.trim() || null,
                  criteria,
                },
                (savedVersion) => {
                  setBaseRevision(savedVersion.revision)
                  setTitle(savedVersion.title)
                  setInstructions(savedVersion.instructions ?? '')
                  setCriteria(
                    savedVersion.criteria.map((criterion) => ({
                      ...criterion,
                    })),
                  )
                  setSaved(true)
                },
              )
            }
          >
            Save Draft
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || stale || (dirty && !saved) || conflict}
            onClick={() => publish(baseRevision)}
          >
            Publish
          </Button>
        </div>
      </fieldset>
    </section>
  )
}
