import { useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../../shared/components/feedback'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '../../../shared/components/ui'
import { ConfirmDialog } from '../../team/components/ConfirmDialog'
import { useOrganization } from '../../organizations/hooks/queries'
import { jobRoutes } from '../../jobs/utils/job-routes'
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
  const navigate = useNavigate()
  const organization = useOrganization(organizationId, Boolean(organizationId))
  const mayView = canViewApplicationForm(organization.data?.permissions)
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
  } | null>(null)
  const [deleting, setDeleting] = useState<ApplicationFormQuestionDto | null>(
    null,
  )
  const [confirm, setConfirm] = useState<'publish' | 'discard' | null>(null)
  const [notice, setNotice] = useState('')
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
  if (organization.isPending || form.isPending)
    return <LoadingState label="Loading application form" />
  if (organization.isError || !mayView)
    return (
      <Wrap>
        <ErrorState
          title="Application form access unavailable"
          description="You do not have permission to view this application form."
        />
      </Wrap>
    )
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
    setNotice('')
    try {
      await action()
    } catch (error) {
      setNotice(applicationFormError(error))
    }
  }
  function move(question: ApplicationFormQuestionDto, direction: -1 | 1) {
    if (!draft) return
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
      <button
        type="button"
        onClick={() => navigate(jobRoutes.detail(organizationId, jobId))}
        className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-sm font-bold text-primary-dark hover:bg-primary-soft"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to job
      </button>
      <PageHeader
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
                    variant="secondary"
                    onClick={() => setConfirm('discard')}
                  >
                    Discard draft
                  </Button>
                  <Button onClick={() => setConfirm('publish')}>
                    Publish draft
                  </Button>
                </>
              ) : (
                <Button
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
                  void form.refetch()
                  ;[
                    create,
                    add,
                    update,
                    remove,
                    reorder,
                    publish,
                    discard,
                  ].forEach((m) => m.reset())
                }}
              >
                Reload latest version
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {!editable ? (
        <div className="mb-5 rounded-control border border-border bg-background p-4 text-sm text-text-secondary">
          You have view-only access to this application form.
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="grid gap-6">
          <section className="rounded-card border border-border bg-surface shadow-sm">
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
                    onClick={() => setEditor({ value: emptyEditor() })}
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
          </section>
        </div>
        <Preview questions={questions} />
      </div>
      {editor && draft ? (
        <QuestionDialog
          initial={editor.value}
          title={editor.question ? 'Edit question' : 'Add question'}
          busy={add.isPending || update.isPending}
          onCancel={() => setEditor(null)}
          onSubmit={(input) =>
            void execute(async () => {
              const payload: QuestionInput = {
                ...input,
                expectedRevision: draft.revision,
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
          <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-bold text-primary-dark">
            {questionTypeLabels[question.type]}
          </span>
          <span className="text-xs font-semibold text-text-secondary">
            {question.required ? 'Required' : 'Optional'}
          </span>
        </div>
        {question.description ? (
          <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">
            {question.description}
          </p>
        ) : null}
        {question.options.length ? (
          <p className="mt-2 text-sm text-text-secondary">
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
          <Button variant="secondary" className="px-3" onClick={onEdit}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Edit {question.label}</span>
          </Button>
          <Button variant="danger" className="px-3" onClick={onDelete}>
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
  onCancel,
  onSubmit,
}: {
  initial: Editor
  title: string
  busy: boolean
  onCancel: () => void
  onSubmit: (value: Omit<QuestionInput, 'expectedRevision'>) => void
}) {
  const [value, setValue] = useState(initial),
    [error, setError] = useState('')
  const choice = isChoice(value.type)
  function submit(e: FormEvent) {
    e.preventDefault()
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
        <form className="mt-5 grid gap-4" onSubmit={submit}>
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
            <div className="grid gap-2">
              <p className="text-sm font-semibold">Options</p>
              {value.options.map((option, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto]"
                >
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
            </div>
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
            <Button loading={busy} type="submit">
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
    <aside className="rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6">
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
  <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
    {children}
  </section>
)
