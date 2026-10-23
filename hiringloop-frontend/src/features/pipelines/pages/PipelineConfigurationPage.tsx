import { useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState } from '../../../shared/components/feedback'
import {
  Button,
  Badge,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  Input,
  PageHeader,
  PageContainer,
} from '../../../shared/components/ui'
import { ConfirmDialog } from '../../team/components/ConfirmDialog'
import { useOrganization } from '../../organizations/hooks/queries'
import { useJob } from '../../jobs/hooks/queries'
import { JobStatusBadge } from '../../jobs/components/JobStatusBadge'
import { jobRoutes } from '../../jobs/utils/job-routes'
import { jobTitle } from '../../jobs/utils/job-utils'
import {
  useCreatePipelineStage,
  useDeletePipelineStage,
  useRenamePipelineStage,
  useReorderPipelineStages,
} from '../hooks/mutations'
import { usePipeline } from '../hooks/queries'
import type { PipelineStageDto } from '../types/pipeline.types'
import {
  canConfigurePipeline,
  canViewPipeline,
  pipelineEditableForJob,
  pipelineError,
  validateStageName,
} from '../utils/pipeline-utils'

export function PipelineConfigurationPage() {
  const { organizationId = '', jobId = '' } = useParams()
  const organization = useOrganization(organizationId, Boolean(organizationId))
  const mayView = canViewPipeline(organization.data?.permissions)
  const job = useJob(
    organizationId,
    jobId,
    Boolean(organizationId && jobId && mayView),
  )
  const pipeline = usePipeline(
    organizationId,
    jobId,
    Boolean(organizationId && jobId && mayView),
  )
  const create = useCreatePipelineStage(organizationId, jobId)
  const rename = useRenamePipelineStage(organizationId, jobId)
  const reorder = useReorderPipelineStages(organizationId, jobId)
  const remove = useDeletePipelineStage(organizationId, jobId)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<PipelineStageDto | null>(null)
  const [deleting, setDeleting] = useState<PipelineStageDto | null>(null)
  const [notice, setNotice] = useState('')
  const [saved, setSaved] = useState(false)

  if (organization.isPending) return <PipelineSkeleton />
  if (organization.isError)
    return (
      <Wrap>
        <ErrorState
          title="Workspace unavailable"
          description="We could not check pipeline access."
          onRetry={() => void organization.refetch()}
        />
      </Wrap>
    )
  if (!mayView)
    return (
      <Wrap>
        <ErrorState
          title="Pipeline access unavailable"
          description="You do not have permission to view this pipeline."
        />
      </Wrap>
    )
  if (job.isPending || pipeline.isPending) return <PipelineSkeleton />
  if (job.isError)
    return (
      <Wrap>
        <ErrorState
          description="We could not load this job."
          onRetry={() => void job.refetch()}
        />
      </Wrap>
    )
  if (pipeline.isError)
    return (
      <Wrap>
        <ErrorState
          title="Pipeline unavailable"
          description={pipelineError(
            pipeline.error,
            'We could not load this pipeline.',
          )}
          onRetry={() => void pipeline.refetch()}
        />
      </Wrap>
    )
  if (!job.data || !pipeline.data) return <PipelineSkeleton />

  const currentPipeline = pipeline.data
  const ordered = [...currentPipeline.stages].sort(
    (a, b) => a.position - b.position,
  )
  if (!ordered.length)
    return (
      <Wrap>
        <ErrorState
          title="Pipeline data needs attention"
          description="This job has no entry stage. Please refresh or contact your workspace administrator."
          onRetry={() => void pipeline.refetch()}
        />
      </Wrap>
    )
  const editable =
    canConfigurePipeline(organization.data.permissions) &&
    pipelineEditableForJob(job.data.status)
  const readOnlyReason = !pipelineEditableForJob(job.data.status)
    ? `This pipeline is read-only because the job is ${job.data.status.toLowerCase()}.`
    : !canConfigurePipeline(organization.data.permissions)
      ? 'You have view-only access to this pipeline.'
      : ''
  const busy =
    create.isPending ||
    rename.isPending ||
    reorder.isPending ||
    remove.isPending

  async function run(action: () => Promise<unknown>) {
    setNotice('')
    setSaved(false)
    try {
      await action()
      setSaved(true)
    } catch (error) {
      setNotice(pipelineError(error))
    }
  }
  async function move(stage: PipelineStageDto, direction: -1 | 1) {
    const index = ordered.findIndex((item) => item.id === stage.id)
    const target = index + direction
    if (stage.kind !== 'STANDARD' || target < 1 || target >= ordered.length)
      return
    const next = [...ordered]
    ;[next[index], next[target]] = [next[target], next[index]]
    await run(() =>
      reorder.mutateAsync({
        stageIds: next.map((item) => item.id),
        expectedVersion: currentPipeline.version,
      }),
    )
  }

  return (
    <Wrap>
      <PageHeader
        breadcrumbs={
          <Link
            className="font-semibold text-text-secondary hover:text-primary-dark hover:underline"
            to={jobRoutes.detail(organizationId, jobId)}
          >
            {jobTitle(job.data.title)}
          </Link>
        }
        title="Pipeline Configuration"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>Configure the hiring stages for this job.</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-text-primary">
              {jobTitle(job.data.title)}
            </span>
            <JobStatusBadge status={job.data.status} />
          </span>
        }
        actions={
          editable ? (
            <Button
              disabled={busy}
              onClick={() => {
                setNotice('')
                setAddOpen(true)
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add stage
            </Button>
          ) : undefined
        }
      />
      {notice ? (
        <div
          role="alert"
          className="mb-5 rounded-control border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          {notice}
        </div>
      ) : null}
      {saved ? (
        <p role="status" className="mb-5 text-sm text-success">
          Pipeline updated.
        </p>
      ) : null}
      {readOnlyReason ? (
        <div className="mb-5 rounded-control border border-border bg-background p-4 text-sm text-text-secondary">
          {readOnlyReason}
        </div>
      ) : null}
      <Card aria-labelledby="pipeline-stages-title" className="overflow-hidden">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 id="pipeline-stages-title" className="text-lg font-bold">
            Hiring stages
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Stages are applied in this order.
          </p>
        </div>
        <ol className="divide-y divide-border">
          {ordered.map((stage, index) => (
            <StageRow
              key={stage.id}
              stage={stage}
              index={index}
              total={ordered.length}
              editable={editable}
              moving={busy}
              onMove={move}
              onEdit={() => {
                setNotice('')
                setEditing(stage)
              }}
              onDelete={() => {
                setNotice('')
                setDeleting(stage)
              }}
            />
          ))}
        </ol>
      </Card>
      {addOpen ? (
        <StageDialog
          title="Add stage"
          description="Add a standard hiring stage to the end of this pipeline."
          confirmLabel="Add stage"
          busy={create.isPending}
          actionError={notice}
          onCancel={() => setAddOpen(false)}
          onSubmit={(name) =>
            run(async () => {
              await create.mutateAsync({
                name,
                expectedVersion: currentPipeline.version,
              })
              setAddOpen(false)
            })
          }
        />
      ) : null}
      {editing ? (
        <StageDialog
          title="Edit stage"
          description="Update the stage name."
          initialName={editing.name}
          confirmLabel="Save changes"
          busy={rename.isPending}
          actionError={notice}
          onCancel={() => setEditing(null)}
          onSubmit={(name) =>
            run(async () => {
              await rename.mutateAsync({
                stageId: editing.id,
                name,
                expectedVersion: currentPipeline.version,
              })
              setEditing(null)
            })
          }
        />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title={`Delete “${deleting.name}”?`}
          description="This removes the stage from this pipeline."
          confirmLabel="Delete stage"
          danger
          busy={remove.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            void run(async () => {
              await remove.mutateAsync({
                stageId: deleting.id,
                expectedVersion: currentPipeline.version,
              })
              setDeleting(null)
            })
          }
        />
      ) : null}
    </Wrap>
  )
}

function StageRow({
  stage,
  index,
  total,
  editable,
  moving,
  onMove,
  onEdit,
  onDelete,
}: {
  stage: PipelineStageDto
  index: number
  total: number
  editable: boolean
  moving: boolean
  onMove: (stage: PipelineStageDto, direction: -1 | 1) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const entry = stage.kind === 'ENTRY'
  return (
    <li className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="break-words font-bold text-text-primary">
            {stage.name}
          </h3>
          <Badge variant={entry ? 'info' : 'neutral'}>
            {entry ? 'Entry stage' : 'Standard stage'}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-text-secondary">Stage {index + 1}</p>
      </div>
      {editable ? (
        <div className="flex flex-wrap gap-2">
          {!entry ? (
            <>
              <Button
                variant="secondary"
                className="px-3"
                disabled={moving || index === 1}
                onClick={() => onMove(stage, -1)}
                aria-label={`Move ${stage.name} up`}
                title={`Move ${stage.name} up`}
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
                <span className="sm:hidden">Up</span>
              </Button>
              <Button
                variant="secondary"
                className="px-3"
                disabled={moving || index === total - 1}
                onClick={() => onMove(stage, 1)}
                aria-label={`Move ${stage.name} down`}
                title={`Move ${stage.name} down`}
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
                <span className="sm:hidden">Down</span>
              </Button>
            </>
          ) : null}
          <Button
            variant="secondary"
            className="px-3"
            disabled={moving}
            onClick={onEdit}
            aria-label={`Edit ${stage.name}`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            <span className="sm:hidden">Edit</span>
          </Button>
          {!entry ? (
            <Button
              variant="danger"
              className="px-3"
              disabled={moving}
              onClick={onDelete}
              aria-label={`Delete ${stage.name}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span className="sm:hidden">Delete</span>
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

function StageDialog({
  title,
  description,
  initialName = '',
  confirmLabel,
  busy,
  actionError,
  onCancel,
  onSubmit,
}: {
  title: string
  description: string
  initialName?: string
  confirmLabel: string
  busy: boolean
  actionError?: string
  onCancel: () => void
  onSubmit: (name: string) => void
}) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | undefined>()
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onCancel()
      }}
    >
      <DialogContent aria-describedby="stage-dialog-description">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription
          id="stage-dialog-description"
          className="mt-2 text-sm text-text-secondary"
        >
          {description}
        </DialogDescription>
        {actionError ? (
          <p role="alert" className="mt-3 text-sm text-error">
            {actionError}
          </p>
        ) : null}
        <form
          className="mt-5 grid gap-5"
          aria-busy={busy}
          onSubmit={(event) => {
            event.preventDefault()
            if (busy) return
            const next = validateStageName(name)
            setError(next)
            if (!next) onSubmit(name.trim())
          }}
        >
          <Field id="stage-name" label="Stage name" required error={error}>
            {({ describedBy, invalid }) => (
              <Input
                id="stage-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                autoFocus
                maxLength={80}
              />
            )}
          </Field>
          <div className="grid gap-2 sm:flex sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" loading={busy} disabled={busy}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PipelineSkeleton() {
  return (
    <Wrap>
      <div
        className="animate-pulse space-y-6"
        aria-busy="true"
        aria-label="Loading pipeline configuration"
      >
        <div className="h-11 w-32 rounded bg-slate-200" />
        <div className="h-20 rounded-card bg-slate-200" />
        <div className="rounded-card border border-border bg-surface p-6">
          <div className="h-6 w-36 rounded bg-slate-200" />
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-20 rounded bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    </Wrap>
  )
}
const Wrap = ({ children }: { children: React.ReactNode }) => (
  <PageContainer width="standard">{children}</PageContainer>
)
