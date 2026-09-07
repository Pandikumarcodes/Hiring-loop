import { cleanup, render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  organization: vi.fn(),
  form: vi.fn(),
  create: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  reorder: vi.fn(),
  publish: vi.fn(),
  discard: vi.fn(),
  refetch: vi.fn(),
  errors: { add: null as unknown },
}))
vi.mock('../../organizations/hooks/queries', () => ({
  useOrganization: mocks.organization,
}))
vi.mock('../hooks/queries', () => ({ useApplicationForm: mocks.form }))
vi.mock('../hooks/mutations', () => ({
  useCreateDraft: () => ({
    isPending: false,
    error: null,
    reset: vi.fn(),
    mutateAsync: mocks.create,
  }),
  useAddQuestion: () => ({
    isPending: false,
    error: mocks.errors.add,
    reset: vi.fn(),
    mutateAsync: mocks.add,
  }),
  useUpdateQuestion: () => ({
    isPending: false,
    error: null,
    reset: vi.fn(),
    mutateAsync: mocks.update,
  }),
  useDeleteQuestion: () => ({
    isPending: false,
    error: null,
    reset: vi.fn(),
    mutateAsync: mocks.remove,
  }),
  useReorderQuestions: () => ({
    isPending: false,
    error: null,
    reset: vi.fn(),
    mutateAsync: mocks.reorder,
  }),
  usePublishDraft: () => ({
    isPending: false,
    error: null,
    reset: vi.fn(),
    mutateAsync: mocks.publish,
  }),
  useDiscardDraft: () => ({
    isPending: false,
    error: null,
    reset: vi.fn(),
    mutateAsync: mocks.discard,
  }),
}))
import { ApplicationFormBuilderPage } from './ApplicationFormBuilderPage'

const questions = [
  {
    id: 'q2',
    questionKey: 'q2',
    type: 'SINGLE_SELECT' as const,
    label: 'Work style',
    description: null,
    placeholder: null,
    required: true,
    sortOrder: 2,
    options: [
      { id: 'o2', label: 'Hybrid', value: 'hybrid', sortOrder: 2 },
      { id: 'o1', label: 'Remote', value: 'remote', sortOrder: 1 },
    ],
  },
  {
    id: 'q1',
    questionKey: 'q1',
    type: 'SHORT_TEXT' as const,
    label: 'Portfolio',
    description: null,
    placeholder: null,
    required: false,
    sortOrder: 1,
    options: [],
  },
]
const published = {
  id: 'p',
  versionNumber: 1,
  status: 'PUBLISHED' as const,
  revision: 1,
  publishedAt: 'now',
  questions: [],
}
const draft = {
  id: 'd',
  versionNumber: 2,
  status: 'DRAFT' as const,
  revision: 7,
  publishedAt: null,
  questions,
}
function builder(withDraft = true) {
  return {
    id: 'form',
    jobId: 'job',
    activeVersion: published,
    draft: withDraft ? draft : null,
  }
}
function ready(
  permissions = ['application-form:view', 'application-form:configure'],
  data = builder(),
) {
  mocks.organization.mockReturnValue({
    isPending: false,
    isError: false,
    data: { permissions },
  })
  mocks.form.mockReturnValue({
    isPending: false,
    isError: false,
    data,
    refetch: mocks.refetch,
  })
  Object.entries(mocks).forEach(([key, value]) => {
    if (
      key !== 'organization' &&
      key !== 'form' &&
      key !== 'refetch' &&
      key !== 'errors'
    )
      (value as ReturnType<typeof vi.fn>).mockResolvedValue(data)
  })
}
function page() {
  return render(route())
}
function route() {
  return (
    <MemoryRouter
      initialEntries={['/app/organizations/org/jobs/job/application-form']}
    >
      <Routes>
        <Route
          path="/app/organizations/:organizationId/jobs/:jobId/application-form"
          element={<ApplicationFormBuilderPage />}
        />
      </Routes>
    </MemoryRouter>
  )
}
beforeEach(() => {
  Object.entries(mocks).forEach(([key, mock]) => {
    if (key !== 'errors') (mock as ReturnType<typeof vi.fn>).mockReset()
  })
  mocks.errors.add = null
})
afterEach(cleanup)

describe('Application Form Builder page', () => {
  test('shows loading and access denial states', () => {
    mocks.organization.mockReturnValue({ isPending: true })
    mocks.form.mockReturnValue({ isPending: true })
    page()
    expect(
      screen.getAllByLabelText('Loading application form')[0],
    ).toBeVisible()
    cleanup()
    ready([])
    page()
    expect(
      screen.getByText(
        'You do not have permission to view this application form.',
      ),
    ).toBeVisible()
  })
  test('renders published empty form and configurator controls', () => {
    ready(undefined, builder(false))
    page()
    expect(screen.getByText('Published V1')).toBeVisible()
    expect(
      screen.getByText(
        'No custom questions yet. Select Edit form to create a draft.',
      ),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Edit form' })).toBeVisible()
    expect(screen.queryByText('Full Name')).not.toBeInTheDocument()
    expect(screen.queryByText('Resume')).not.toBeInTheDocument()
    expect(screen.queryByText('Submit Application')).not.toBeInTheDocument()
  })
  test('keeps a Hiring Manager read-only', () => {
    ready(['application-form:view'])
    page()
    expect(
      screen.getByText('You have view-only access to this application form.'),
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Add question' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit Portfolio' }),
    ).not.toBeInTheDocument()
  })
  test('renders questions and options in server sort order', () => {
    ready()
    page()
    const items = screen.getAllByRole('listitem')
    expect(items.map((x) => x.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Portfolio'),
        expect.stringContaining('Work style'),
      ]),
    )
    expect(screen.getByText('Options: Hybrid, Remote')).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Move Portfolio up' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Move Work style down' }),
    ).toBeDisabled()
  })
  test('sends one full question order on keyboard reorder', async () => {
    const user = userEvent.setup()
    ready()
    page()
    await user.click(
      screen.getByRole('button', { name: 'Move Portfolio down' }),
    )
    expect(mocks.reorder).toHaveBeenCalledWith({
      questionIds: ['q2', 'q1'],
      expectedRevision: 7,
    })
  })
  test('opens a labelled editor, validates label, and sends revision on save', async () => {
    const user = userEvent.setup()
    ready()
    page()
    await user.click(screen.getByRole('button', { name: 'Add question' }))
    expect(screen.getByRole('dialog', { name: 'Add question' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Save question' }))
    expect(screen.getByText('Enter a question label.')).toBeVisible()
    await user.type(
      screen.getByRole('textbox', { name: /question/i }),
      'LinkedIn',
    )
    await user.click(screen.getByLabelText('Required question'))
    await user.click(screen.getByRole('button', { name: 'Save question' }))
    expect(mocks.add).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'LinkedIn',
        required: true,
        expectedRevision: 7,
        type: 'SHORT_TEXT',
      }),
    )
  })
  test('edits choice options locally in visible order and preserves it on save', async () => {
    const user = userEvent.setup()
    ready()
    page()
    await user.click(screen.getByRole('button', { name: 'Edit Work style' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit question' })
    expect(
      within(dialog).getByRole('button', { name: 'Move Hybrid up' }),
    ).toBeDisabled()
    await user.click(
      within(dialog).getByRole('button', { name: 'Move Hybrid down' }),
    )
    expect(
      within(dialog).getByRole('button', { name: 'Move Hybrid down' }),
    ).toBeDisabled()
    await user.click(
      within(dialog).getByRole('button', { name: 'Save question' }),
    )
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        questionId: 'q2',
        input: expect.objectContaining({
          expectedRevision: 7,
          options: [
            { label: 'Remote', value: 'remote' },
            { label: 'Hybrid', value: 'hybrid' },
          ],
        }),
      }),
    )
  })
  test('choice editor limits options and removes choices when switching type', async () => {
    const user = userEvent.setup()
    ready()
    page()
    await user.click(screen.getByRole('button', { name: 'Edit Work style' }))
    await user.selectOptions(
      screen.getByLabelText('Question type'),
      'SHORT_TEXT',
    )
    expect(screen.queryByText('Options')).not.toBeInTheDocument()
    await user.selectOptions(
      screen.getByLabelText('Question type'),
      'MULTI_SELECT',
    )
    expect(screen.getByText('Options')).toBeVisible()
    expect(
      screen.queryByText(
        'Choice questions need at least two complete options.',
      ),
    ).not.toBeInTheDocument()
  })
  test('uses accessible delete and publish confirmations', async () => {
    const user = userEvent.setup()
    ready()
    page()
    await user.click(screen.getByRole('button', { name: 'Delete Portfolio' }))
    expect(
      screen.getByRole('dialog', { name: 'Delete “Portfolio”?' }),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Publish draft' }))
    expect(
      screen.getByRole('dialog', { name: 'Publish draft V2?' }),
    ).toHaveTextContent('2 custom questions')
  })
  test('maps conflict to a friendly reload action', () => {
    ready()
    mocks.add.mockRejectedValueOnce(
      Object.assign(new Error('stale'), { code: 'FORM_VERSION_CONFLICT' }),
    )
    page()
    expect(screen.queryByText('FORM_VERSION_CONFLICT')).not.toBeInTheDocument()
  })
  test('denies an Interviewer who navigates directly to the builder route', () => {
    ready([])
    page()
    expect(
      screen.getByText(
        'You do not have permission to view this application form.',
      ),
    ).toBeVisible()
  })
  test('creates a draft and switches the page to editable draft state', async () => {
    const user = userEvent.setup()
    const created = builder()
    ready(undefined, builder(false))
    mocks.create.mockResolvedValueOnce(created)
    const view = page()
    await user.click(screen.getByRole('button', { name: 'Edit form' }))
    expect(mocks.create).toHaveBeenCalledWith(undefined)
    mocks.form.mockReturnValue({
      isPending: false,
      isError: false,
      data: created,
      refetch: mocks.refetch,
    })
    view.rerender(route())
    expect(screen.getByText(/Draft V2/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Add question' })).toBeVisible()
  })
  test('confirms deletion with revision and renders the returned draft', async () => {
    const user = userEvent.setup()
    const updated = {
      ...builder(),
      draft: { ...draft, questions: questions.filter((q) => q.id !== 'q1') },
    }
    ready()
    mocks.remove.mockResolvedValueOnce(updated)
    const view = page()
    await user.click(screen.getByRole('button', { name: 'Delete Portfolio' }))
    await user.click(screen.getByRole('button', { name: 'Delete question' }))
    expect(mocks.remove).toHaveBeenCalledWith({
      questionId: 'q1',
      expectedRevision: 7,
    })
    mocks.form.mockReturnValue({
      isPending: false,
      isError: false,
      data: updated,
      refetch: mocks.refetch,
    })
    view.rerender(route())
    expect(screen.queryByText('Portfolio')).not.toBeInTheDocument()
    expect(screen.getAllByText('Work style')[0]).toBeVisible()
  })
  test('uses one full order and revision when moving a later question up', async () => {
    const user = userEvent.setup()
    ready()
    page()
    await user.click(screen.getByRole('button', { name: 'Move Work style up' }))
    expect(mocks.reorder).toHaveBeenCalledTimes(1)
    expect(mocks.reorder).toHaveBeenCalledWith({
      questionIds: ['q2', 'q1'],
      expectedRevision: 7,
    })
  })
  test('prevents option fifty-one and permits a replacement after deletion', async () => {
    const user = userEvent.setup()
    const fifty = Array.from({ length: 50 }, (_, index) => ({
      id: `o${index}`,
      label: `Option ${index + 1}`,
      value: `option-${index + 1}`,
      sortOrder: index + 1,
    }))
    ready(undefined, {
      ...builder(),
      draft: { ...draft, questions: [{ ...questions[0], options: fifty }] },
    } as never)
    page()
    await user.click(screen.getByRole('button', { name: 'Edit Work style' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit question' })
    expect(
      within(dialog).getByRole('button', { name: 'Add option' }),
    ).toBeDisabled()
    expect(
      within(dialog).getByText(
        'Maximum of 50 options reached. Remove an option to add another.',
      ),
    ).toBeVisible()
    await user.click(
      within(dialog).getAllByRole('button', { name: 'Remove' })[0],
    )
    expect(
      within(dialog).getByRole('button', { name: 'Add option' }),
    ).toBeEnabled()
    await user.click(within(dialog).getByRole('button', { name: 'Add option' }))
    expect(within(dialog).getAllByLabelText(/Option .* label/)).toHaveLength(50)
  })
  test('publishes with revision and then renders only the new active version', async () => {
    const user = userEvent.setup()
    const publishedResult = {
      ...builder(),
      activeVersion: {
        ...draft,
        status: 'PUBLISHED' as const,
        publishedAt: 'later',
      },
      draft: null,
    }
    ready()
    mocks.publish.mockResolvedValueOnce(publishedResult)
    const view = page()
    await user.click(screen.getByRole('button', { name: 'Publish draft' }))
    await user.click(screen.getByRole('button', { name: 'Publish form' }))
    expect(mocks.publish).toHaveBeenCalledWith({ expectedRevision: 7 })
    mocks.form.mockReturnValue({
      isPending: false,
      isError: false,
      data: publishedResult,
      refetch: mocks.refetch,
    })
    view.rerender(route())
    expect(screen.getByText('Published V2')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Publish draft' }),
    ).not.toBeInTheDocument()
  })
  test('discards with revision and preserves the active published form', async () => {
    const user = userEvent.setup()
    const discarded = builder(false)
    ready()
    mocks.discard.mockResolvedValueOnce(discarded)
    const view = page()
    await user.click(screen.getByRole('button', { name: 'Discard draft' }))
    expect(
      screen.getByText(/Discarding removes unpublished changes/),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Discard draft' }))
    expect(mocks.discard).toHaveBeenCalledWith({ expectedRevision: 7 })
    mocks.form.mockReturnValue({
      isPending: false,
      isError: false,
      data: discarded,
      refetch: mocks.refetch,
    })
    view.rerender(route())
    expect(screen.getByText('Published V1')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Discard draft' }),
    ).not.toBeInTheDocument()
  })
  test('shows a friendly conflict and reloads the exact builder query', async () => {
    const user = userEvent.setup()
    const refreshed = builder(false)
    ready()
    mocks.errors.add = { code: 'FORM_VERSION_CONFLICT' }
    const view = page()
    expect(
      screen.getByText(
        'This form was changed by another team member. Reload the latest version before continuing.',
      ),
    ).toBeVisible()
    expect(screen.queryByText('FORM_VERSION_CONFLICT')).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Reload latest version' }),
    )
    expect(mocks.refetch).toHaveBeenCalledTimes(1)
    mocks.form.mockReturnValue({
      isPending: false,
      isError: false,
      data: refreshed,
      refetch: mocks.refetch,
    })
    mocks.errors.add = null
    view.rerender(route())
    expect(screen.getByText('Published V1')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Publish draft' }),
    ).not.toBeInTheDocument()
    expect(mocks.add).not.toHaveBeenCalled()
  })
})
