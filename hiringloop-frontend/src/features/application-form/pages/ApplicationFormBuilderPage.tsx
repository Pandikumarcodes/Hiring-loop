import { useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../../shared/components/feedback'
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
  Select,
  Textarea,
} from '../../../shared/components/ui'
import { ConfirmDialog } from '../../team/components/ConfirmDialog'
import { useOrganization } from '../../organizations/hooks/queries'
import { jobRoutes } from '../../jobs/utils/job-routes'
import { useJob } from '../../jobs/hooks/queries'
import { jobTitle } from '../../jobs/utils/job-utils'
import {
  useAddQuestion,
  useCreateDraft,
  useDeleteQuestion,
  useDiscardDraft,
  usePublishDraft,
  useReorderQuestions,
  useUpdateQuestion,
} from '../hooks/mutations'
import { useApplicationForm } from '../hooks/queries'
import type {
  ApplicationFormQuestionDto,
  ApplicationFormQuestionType,
  QuestionInput,
} from '../types/application-form.types'
import {
  applicationFormError,
  canConfigureApplicationForm,
  canViewApplicationForm,
  isChoice,
  questionTypeLabels,
} from '../utils/application-form-utils'

const types = Object.keys(questionTypeLabels) as ApplicationFormQuestionType[]
const emptyEditor = (): Editor => ({
  type: 'SHORT_TEXT',
  label: '',
  description: '',
  placeholder: '',
  required: false,
  options: [],
})
type Editor = {
  type: ApplicationFormQuestionType
  label: string
  description: string
  placeholder: string
  required: boolean
  options: { label: string; value: string }[]
}

export function ApplicationFormBuilderPage() {
  const { organizationId = '', jobId = '' } = useParams()
  const organization = useOrganization(organizationId, Boolean(organizationId))
  const mayView = canViewApplicationForm(organization.data?.permissions)
  const job = useJob(
    organizationId,
    jobId,
    Boolean(
      organizationId &&
        jobId &&
        mayView &&
        organization.data?.permissions?.includes('job:read'),
    ),
  )
  const form = useApplicationForm(
    organizationId,
    jobId,
    Boolean(organizationId && jobId && mayView),
  )
  const create = useCreateDraft(organizationId, jobId),
    add = useAddQuestion(organizationId, jobId),
    update = useUpdateQuestion(organizationId, jobId),
    remove = useDeleteQuestion(organizationId, jobId),
    reorder = useReorderQuestions(organizationId, jobId),
    publish = usePublishDraft(organizationId, jobId),
    discard = useDiscardDraft(organizationId, jobId)
  const [editor, setEditor] = useState<{
    question?: ApplicationFormQuestionDto
    value: Editor
    baseRevision: number
  } | null>(null)
  const [deleting, setDeleting] = useState<ApplicationFormQuestionDto | null>(
    null,
  )
  const [confirm, setConfirm] = useState<'publish' | 'discard' | null>(null)
  const [notice, setNotice] = useState('')
  const [saved, setSaved] = useState(false)
  const conflict = [
    create,
    add,
    update,
    remove,
    reorder,
    publish,
    discard,
  ].some(
    (m) =>
      (m.error as { code?: string } | null)?.code === 'FORM_VERSION_CONFLICT',
  )
  if (organization.isPending)
    return <LoadingState label="Loading application form" />
  if (organization.isError)
    return (
      <Wrap>
        <ErrorState
          title="Workspace unavailable"
          description="We could not check application form access."
          onRetry={() => void organization.refetch()}
        />
      </Wrap>
    )
  if (!mayView)
    return (
      <Wrap>
        <ErrorState
          title="Application form access unavailable"
          description="You do not have permission to view this application form."
        />
      </Wrap>
    )
  if (form.isPending) return <LoadingState label="Loading application form" />
  if (form.isError || !form.data)
    return (
      <Wrap>
        <ErrorState
          title="Application form unavailable"
          description={applicationFormError(
            form.error,
            'We could not load this application form.',
          )}
          onRetry={() => void form.refetch()}
        />
      </Wrap>
    )
  const data = form.data,
    draft = data.draft,
    editable = canConfigureApplicationForm(organization.data.permissions)
  const questions = [...(draft ?? data.activeVersion).questions].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )
  const busy =
    create.isPending ||
    add.isPending ||
    update.isPending ||
    remove.isPending ||
    reorder.isPending ||
    publish.isPending ||
    discard.isPending
  async function execute(action: () => Promise<unknown>) {
    if (busy) return
    setNotice('')
    setSaved(false)
    try {
      await action()
      setSaved(true)
    } catch (error) {
      setNotice(applicationFormError(error))
    }
  }
  function move(question: ApplicationFormQuestionDto, direction: -1 | 1) {
    if (!draft || busy) return
    const index = questions.findIndex((q) => q.id === question.id)
    const target = index + direction
    if (target < 0 || target >= questions.length) return
    const next = [...questions]
    ;[next[index], next[target]] = [next[target], next[index]]
    void execute(() =>
      reorder.mutateAsync({
        questionIds: next.map((q) => q.id),
        expectedRevision: draft.revision,
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
            {job.data ? jobTitle(job.data.title) : 'Job detail'}
          </Link>
        }
        title="Application form"
        description={
          <span>
            Published V{data.activeVersion.versionNumber}
            {draft ? ` · Draft V${draft.versionNumber}` : ''}
          </span>
        }
        actions={
          editable ? (
            <div className="flex flex-wrap gap-2">
              {draft ? (
                <>
                  <Button
                    disabled={busy}
                    variant="secondary"
                    onClick={() => setConfirm('discard')}
                  >
                    Discard draft
                  </Button>
                  <Button disabled={busy} onClick={() => setConfirm('publish')}>
                    Publish draft
                  </Button>
                </>
              ) : (
                <Button
                  disabled={busy}
                  onClick={() =>
                    void execute(() => create.mutateAsync(undefined))
                  }
                >
                  Edit form
                </Button>
              )}
            </div>
          ) : undefined
        }
      />
      {notice || conflict ? (
        <div
          role="alert"
          className="mb-5 rounded-control border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          {notice ||
            'This form was changed by another team member. Reload the latest version before continuing.'}
          {conflict ? (
            <div className="mt-3">
              <Button
                variant="secondary"
                onClick={() => {
                  void form.refetch().then((result) => {
                    if (!result.isSuccess) return
                    setEditor(null)
                    setNotice('')
                    setSaved(false)
                    ;[
                      create,
                      add,
                      update,
                      remove,
                      reorder,
                      publish,
                      discard,
                    ].forEach((m) => m.reset())
                  })
                }}
              >
                Reload latest version
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {saved && !conflict ? (
        <p role="status" className="mb-5 text-sm text-success">
          Application form updated.
        </p>
      ) : null}
      {!editable ? (
        <div className="mb-5 rounded-control border border-border bg-background p-4 text-sm text-text-secondary">
          You have view-only access to this application form.
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="grid gap-6">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold">Custom questions</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {questions.length} of 100 questions
                </p>
              </div>
              {editable && draft ? (
                <div className="grid gap-1 justify-items-end">
                  <Button
                    disabled={questions.length >= 100 || busy}
                    onClick={() =>
                      setEditor({
                        value: emptyEditor(),
                        baseRevision: draft.revision,
                      })
                    }
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" /> Add question
                  </Button>
                  {questions.length >= 100 ? (
                    <p className="text-xs text-text-secondary">
                      Maximum of 100 custom questions reached.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            {questions.length ? (
              <ol className="divide-y divide-border">
                {questions.map((q, i) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={i}
                    total={questions.length}
                    editable={Boolean(editable && draft)}
                    busy={busy}
                    onMove={move}
                    onEdit={() =>
                      setEditor({
                        question: q,
                        baseRevision: draft!.revision,
                        value: {
                          type: q.type,
                          label: q.label,
                          description: q.description ?? '',
                          placeholder: q.placeholder ?? '',
                          required: q.required,
                          options: q.options.map((o) => ({
                            label: o.label,
                            value: o.value,
                          })),
                        },
                      })
                    }
                    onDelete={() => setDeleting(q)}
                  />
                ))}
              </ol>
            ) : (
              <div className="p-6 text-sm text-text-secondary">
                No custom questions yet.
                {editable && !draft
                  ? ' Select Edit form to create a draft.'
                  : ''}
              </div>
            )}
          </Card>
        </div>
        <Preview questions={questions} />
      </div>
      {editor && draft ? (
        <QuestionDialog
          initial={editor.value}
          title={editor.question ? 'Edit question' : 'Add question'}
          busy={add.isPending || update.isPending}
          actionError={notice}
          onCancel={() => setEditor(null)}
          onSubmit={(input) =>
            void execute(async () => {
              const payload: QuestionInput = {
                ...input,
                expectedRevision: editor.baseRevision,
              }
              if (editor.question)
                await update.mutateAsync({
                  questionId: editor.question.id,
                  input: payload,
                })
              else await add.mutateAsync(payload)
              setEditor(null)
            })
          }
        />
      ) : null}
      {deleting && draft ? (
        <ConfirmDialog
          title={`Delete “${deleting.label}”?`}
          description="This removes the question from the current draft. Published versions remain unchanged."
          confirmLabel="Delete question"
          danger
          busy={remove.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            void execute(async () => {
              await remove.mutateAsync({
                questionId: deleting.id,
                expectedRevision: draft.revision,
              })
              setDeleting(null)
            })
          }
        />
      ) : null}
      {confirm && draft ? (
        <ConfirmDialog
          title={
            confirm === 'publish'
              ? `Publish draft V${draft.versionNumber}?`
              : 'Discard draft?'
          }
          description={
            confirm === 'publish'
              ? `This publishes ${questions.length} custom questions for future applicants. Historical versions remain unchanged.`
              : 'Discarding removes unpublished changes. The published application form remains unchanged.'
          }
          confirmLabel={
            confirm === 'publish' ? 'Publish form' : 'Discard draft'
          }
          danger={confirm === 'discard'}
          busy={confirm === 'publish' ? publish.isPending : discard.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            void execute(async () => {
              if (confirm === 'publish')
                await publish.mutateAsync({ expectedRevision: draft.revision })
              else
                await discard.mutateAsync({ expectedRevision: draft.revision })
              setConfirm(null)
            })
          }
        />
      ) : null}
    </Wrap>
  )
}

function QuestionCard({
  question,
  index,
  total,
  editable,
  busy,
  onMove,
  onEdit,
  onDelete,
}: {
  question: ApplicationFormQuestionDto
  index: number
  total: number
  editable: boolean
  busy: boolean
  onMove: (q: ApplicationFormQuestionDto, d: -1 | 1) => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <li className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="break-words font-bold">{question.label}</h3>
          <Badge variant="info">{questionTypeLabels[question.type]}</Badge>
          <Badge variant={question.required ? 'warning' : 'neutral'}>
            {question.required ? 'Required' : 'Optional'}
          </Badge>
        </div>
        {question.description ? (
          <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">
            {question.description}
          </p>
        ) : null}
        {question.options.length ? (
          <p className="mt-2 break-words text-sm text-text-secondary">
            Options: {question.options.map((o) => o.label).join(', ')}
          </p>
        ) : null}
      </div>
      {editable ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            className="px-3"
            disabled={busy || index === 0}
            aria-label={`Move ${question.label} up`}
            onClick={() => onMove(question, -1)}
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            className="px-3"
            disabled={busy || index === total - 1}
            aria-label={`Move ${question.label} down`}
            onClick={() => onMove(question, 1)}
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            className="px-3"
            disabled={busy}
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Edit {question.label}</span>
          </Button>
          <Button
            variant="danger"
            className="px-3"
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Delete {question.label}</span>
          </Button>
        </div>
      ) : null}
    </li>
  )
}

function QuestionDialog({
  initial,
  title,
  busy,
  actionError,
  onCancel,
  onSubmit,
}: {
  initial: Editor
  title: string
  busy: boolean
  actionError?: string
  onCancel: () => void
  onSubmit: (value: Omit<QuestionInput, 'expectedRevision'>) => void
}) {
  const [value, setValue] = useState(initial),
    [error, setError] = useState('')
  const choice = isChoice(value.type)
  function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!value.label.trim()) return setError('Enter a question label.')
    if (
      choice &&
      (value.options.length < 2 ||
        value.options.some((o) => !o.label.trim() || !o.value.trim()))
    )
      return setError('Choice questions need at least two complete options.')
    if (value.options.length > 50) return setError('Use 50 options or fewer.')
    setError('')
    onSubmit({
      type: value.type,
      label: value.label.trim(),
      description: value.description.trim() || null,
      placeholder: value.placeholder.trim() || null,
      required: value.required,
      ...(choice
        ? {
            options: value.options.map((o) => ({
              label: o.label.trim(),
              value: o.value.trim(),
            })),
          }
        : {}),
    })
  }
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent aria-describedby="question-dialog-description">
        <DialogTitle className="pr-8 text-lg font-bold">{title}</DialogTitle>
        <DialogDescription
          id="question-dialog-description"
          className="mt-2 text-sm text-text-secondary"
        >
          Configure a custom question for the draft.
        </DialogDescription>
        {actionError ? (
          <p role="alert" className="mt-3 text-sm text-error">
            {actionError}
          </p>
        ) : null}
        <form className="mt-5 grid gap-5" aria-busy={busy} onSubmit={submit}>
          <Field id="question-type" label="Question type">
            {(p) => (
              <Select
                id="question-type"
                value={value.type}
                aria-describedby={p.describedBy}
                onChange={(e) =>
                  setValue((v) => ({
                    ...v,
                    type: e.target.value as ApplicationFormQuestionType,
                    options: isChoice(
                      e.target.value as ApplicationFormQuestionType,
                    )
                      ? v.options
                      : [],
                  }))
                }
              >
                {types.map((t) => (
                  <option key={t} value={t}>
                    {questionTypeLabels[t]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="question-label" label="Question" required error={error}>
            {(p) => (
              <Input
                id="question-label"
                value={value.label}
                aria-describedby={p.describedBy}
                aria-invalid={p.invalid}
                onChange={(e) =>
                  setValue((v) => ({ ...v, label: e.target.value }))
                }
              />
            )}
          </Field>
          <Field id="question-description" label="Description (optional)">
            {(p) => (
              <Textarea
                id="question-description"
                value={value.description}
                aria-describedby={p.describedBy}
                onChange={(e) =>
                  setValue((v) => ({ ...v, description: e.target.value }))
                }
              />
            )}
          </Field>
          <Field id="question-placeholder" label="Placeholder (optional)">
            {(p) => (
              <Input
                id="question-placeholder"
                value={value.placeholder}
                aria-describedby={p.describedBy}
                onChange={(e) =>
                  setValue((v) => ({ ...v, placeholder: e.target.value }))
                }
              />
            )}
          </Field>
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={value.required}
              onChange={(e) =>
                setValue((v) => ({ ...v, required: e.target.checked }))
              }
            />{' '}
            Required question
          </label>
          {choice ? (
            <fieldset className="min-w-0 rounded-control border border-border p-4">
              <legend className="px-1 text-sm font-semibold">Options</legend>
              <p className="mb-3 text-sm text-text-secondary">
                Set the candidate-facing label and stored value for each choice.
              </p>
              <div className="grid gap-3">
                {value.options.map((option, index) => (
                  <div
                    key={index}
                    className="grid min-w-0 grid-cols-1 gap-2 rounded-control border border-border p-3 sm:grid-cols-2"
                  >
                    <p className="text-sm font-semibold sm:col-span-2">
                      Choice {index + 1}
                    </p>
                    <Input
                      aria-label={`Option ${index + 1} label`}
                      value={option.label}
                      placeholder="Label"
                      onChange={(e) =>
                        setValue((v) => ({
                          ...v,
                          options: v.options.map((o, i) =>
                            i === index ? { ...o, label: e.target.value } : o,
                          ),
                        }))
                      }
                    />
                    <Input
                      aria-label={`Option ${index + 1} value`}
                      value={option.value}
                      placeholder="Value"
                      onChange={(e) =>
                        setValue((v) => ({
                          ...v,
                          options: v.options.map((o, i) =>
                            i === index ? { ...o, value: e.target.value } : o,
                          ),
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={value.options.length <= 2}
                      onClick={() =>
                        setValue((v) => ({
                          ...v,
                          options: v.options.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      Remove
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={index === 0}
                      aria-label={`Move ${option.label || `option ${index + 1}`} up`}
                      onClick={() =>
                        setValue((v) => {
                          const options = [...v.options]
                          ;[options[index - 1], options[index]] = [
                            options[index],
                            options[index - 1],
                          ]
                          return { ...v, options }
                        })
                      }
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Move up</span>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={index === value.options.length - 1}
                      aria-label={`Move ${option.label || `option ${index + 1}`} down`}
                      onClick={() =>
                        setValue((v) => {
                          const options = [...v.options]
                          ;[options[index], options[index + 1]] = [
                            options[index + 1],
                            options[index],
                          ]
                          return { ...v, options }
                        })
                      }
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Move down</span>
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={value.options.length >= 50}
                onClick={() =>
                  setValue((v) => ({
                    ...v,
                    options: [...v.options, { label: '', value: '' }],
                  }))
                }
              >
                Add option
              </Button>
              {value.options.length >= 50 ? (
                <p className="text-sm text-text-secondary">
                  Maximum of 50 options reached. Remove an option to add
                  another.
                </p>
              ) : null}
            </fieldset>
          ) : null}
          <div className="mt-2 grid gap-2 sm:flex sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button loading={busy} disabled={busy} type="submit">
              Save question
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Preview({
  questions,
}: {
  questions: readonly ApplicationFormQuestionDto[]
}) {
  return (
    <aside className="min-w-0 rounded-card border border-border bg-surface-raised p-5 shadow-surface sm:p-6">
      <h2 className="text-lg font-bold">Form preview</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Visual preview only — candidate submission is not available.
      </p>
      <div className="mt-5 grid gap-4">
        {questions.map((q) => (
          <PreviewQuestion key={q.id} question={q} />
        ))}
      </div>
    </aside>
  )
}
function PreviewQuestion({
  question: q,
}: {
  question: ApplicationFormQuestionDto
}) {
  const label = (
    <span>
      {q.label}{' '}
      {q.required ? (
        <span className="text-text-secondary">Required</span>
      ) : null}
    </span>
  )
  if (q.type === 'LONG_TEXT')
    return (
      <label className="grid gap-2 text-sm font-semibold">
        {label}
        <Textarea disabled placeholder={q.placeholder ?? undefined} />
      </label>
    )
  if (q.type === 'YES_NO')
    return (
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">{label}</legend>
        <label>
          <input disabled type="radio" name={q.id} /> Yes
        </label>
        <label>
          <input disabled type="radio" name={q.id} /> No
        </label>
      </fieldset>
    )
  if (isChoice(q.type))
    return (
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">{label}</legend>
        {q.options.map((o) => (
          <label key={o.id}>
            <input
              disabled
              type={q.type === 'SINGLE_SELECT' ? 'radio' : 'checkbox'}
              name={q.id}
            />{' '}
            {o.label}
          </label>
        ))}
      </fieldset>
    )
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <Input
        disabled
        type={
          q.type === 'NUMBER'
            ? 'number'
            : q.type === 'DATE'
              ? 'date'
              : q.type === 'URL'
                ? 'url'
                : 'text'
        }
        placeholder={q.placeholder ?? undefined}
      />
    </label>
  )
}
const Wrap = ({ children }: { children: React.ReactNode }) => (
  <PageContainer width="wide">{children}</PageContainer>
)
