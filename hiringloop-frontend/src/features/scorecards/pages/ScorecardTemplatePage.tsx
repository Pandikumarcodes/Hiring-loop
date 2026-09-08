import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Badge,
  Button,
  Input,
  PageHeader,
  Textarea,
} from '../../../shared/components/ui'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../shared/components/feedback'
import { isApiError } from '../../../shared/lib/apiErrors'
import { useOrganization } from '../../organizations/hooks/queries'
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
  const organization = useOrganization(organizationId)
  const canManage =
    organization.data?.permissions?.includes('scorecard-template:manage') ??
    false
  const canView =
    organization.data?.permissions?.includes('scorecard-template:view') ?? false
  const query = useScorecardTemplate(organizationId, jobId, canView)
  const create = useCreateDraft(organizationId, jobId)
  const update = useUpdateDraft(organizationId, jobId)
  const publish = usePublishDraft(organizationId, jobId)
  const [publishing, setPublishing] = useState(false)
  const conflict = [update.error, publish.error].some(
    (error) => isApiError(error) && error.status === 409,
  )
  if (organization.isPending || query.isPending)
    return <LoadingState label="Loading scorecard configuration" />
  if (!canView || query.isError)
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <ErrorState
          title="Scorecard unavailable"
          description="You do not have permission to view this scorecard."
        />
      </main>
    )
  const template = query.data
  if (!template)
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <PageHeader title="Scorecard" />
        <section className="mt-6 rounded-card border border-border bg-surface p-6">
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
        </section>
      </main>
    )
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        title="Scorecard"
        description="Structured interview evaluation form"
      />
      <section className="mt-6 rounded-card border border-border bg-surface p-5 sm:p-6">
        {template.activeVersion ? (
          <Version version={template.activeVersion} label="Published" />
        ) : null}
        {template.draft && canManage ? (
          <Editor
            key={`${template.draft.id}-${template.draft.revision}`}
            version={template.draft}
            busy={update.isPending || publish.isPending}
            conflict={conflict}
            reload={() => void query.refetch()}
            save={(value) => update.mutate(value)}
            publish={() => setPublishing(true)}
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
      </section>
      {publishing && template.draft ? (
        <ConfirmDialog
          title="Publish scorecard?"
          description="Published scorecard versions are immutable."
          confirmLabel="Publish"
          busy={publish.isPending}
          onCancel={() => setPublishing(false)}
          onConfirm={() =>
            publish.mutate(
              { expectedRevision: template.draft!.revision },
              { onSuccess: () => setPublishing(false) },
            )
          }
        />
      ) : null}
    </main>
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
    <section className="mb-6">
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
            <li key={criterion.id}>
              <strong>{criterion.label}</strong> · {criterion.type} ·{' '}
              {criterion.required ? 'Required' : 'Optional'}
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
  reload,
  save,
  publish,
}: {
  version: TemplateVersion
  busy: boolean
  conflict: boolean
  reload: () => void
  save: (value: {
    expectedRevision: number
    title: string
    instructions: string | null
    criteria: readonly CriterionInput[]
  }) => void
  publish: () => void
}) {
  const [title, setTitle] = useState(version.title)
  const [instructions, setInstructions] = useState(version.instructions ?? '')
  const [criteria, setCriteria] = useState<CriterionInput[]>(() =>
    version.criteria.map((criterion) => ({ ...criterion })),
  )
  const normalize = (items: CriterionInput[]) =>
    items.map((criterion, index) => ({ ...criterion, position: index + 1 }))
  const patch = (index: number, value: Partial<CriterionInput>) =>
    setCriteria((old) =>
      normalize(
        old.map((criterion, itemIndex) =>
          itemIndex === index ? { ...criterion, ...value } : criterion,
        ),
      ),
    )
  return (
    <section>
      <Badge>Draft v{version.versionNumber}</Badge>
      <label className="mt-4 block font-semibold">
        Title
        <Input
          value={title}
          maxLength={160}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="mt-4 block font-semibold">
        Instructions
        <Textarea
          value={instructions}
          maxLength={10000}
          onChange={(event) => setInstructions(event.target.value)}
        />
      </label>
      <h2 className="mt-5 text-lg font-bold">Criteria</h2>
      <div className="mt-3 grid gap-4">
        {criteria.map((criterion, index) => (
          <div
            key={`${criterion.id ?? 'new'}-${index}`}
            className="rounded-control border border-border p-4"
          >
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
                <select
                  value={criterion.type}
                  onChange={(event) =>
                    patch(index, {
                      type: event.target.value as CriterionInput['type'],
                    })
                  }
                >
                  <option value="RATING">Rating</option>
                  <option value="TEXT">Text</option>
                </select>
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
          </div>
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
      <div className="mt-5 flex gap-3">
        <Button
          loading={busy}
          disabled={!title.trim()}
          onClick={() =>
            save({
              expectedRevision: version.revision,
              title: title.trim(),
              instructions: instructions.trim() || null,
              criteria,
            })
          }
        >
          Save Draft
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={publish}
        >
          Publish
        </Button>
      </div>
    </section>
  )
}
