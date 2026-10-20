import { act, cleanup, render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/apiErrors'
import { ScorecardTemplatePage } from './ScorecardTemplatePage'

const templateQuery = vi.fn()
const organizationQuery = vi.fn()
const createMutate = vi.fn()
const updateMutate = vi.fn()
const publishMutate = vi.fn()
let templateConflict = false

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useParams: () => ({ organizationId: 'org', jobId: 'job' }),
}))
vi.mock('../../jobs/hooks/queries', () => ({
  useJob: () => ({ data: { title: 'Engineer' }, isPending: false }),
}))
vi.mock('../../organizations/hooks/queries', () => ({
  useOrganization: () => organizationQuery(),
}))
vi.mock('../hooks/queries', () => ({
  useScorecardTemplate: () => templateQuery(),
}))
vi.mock('../hooks/mutations', () => ({
  useCreateDraft: () => ({
    mutate: createMutate,
    isPending: false,
    isError: false,
  }),
  useUpdateDraft: () => ({
    mutate: updateMutate,
    isPending: false,
    reset: vi.fn(),
    error: templateConflict
      ? new ApiError({
          kind: 'response',
          code: 'CONFLICT',
          message: 'conflict',
          status: 409,
        })
      : null,
  }),
  usePublishDraft: () => ({
    mutate: publishMutate,
    isPending: false,
    reset: vi.fn(),
    error: null,
  }),
}))

const draft = {
  id: 'draft',
  versionNumber: 1,
  status: 'DRAFT',
  title: 'Interview',
  instructions: null,
  revision: 3,
  publishedAt: null,
  criteria: [
    {
      id: 'one',
      label: 'One',
      description: null,
      type: 'RATING',
      required: true,
      position: 1,
    },
    {
      id: 'two',
      label: 'Two',
      description: null,
      type: 'TEXT',
      required: true,
      position: 2,
    },
  ],
}

function ready(data: unknown) {
  templateQuery.mockReturnValue({
    data,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  })
  organizationQuery.mockReturnValue({
    data: {
      permissions: ['scorecard-template:view', 'scorecard-template:manage'],
    },
    isPending: false,
  })
}
const renderPage = () =>
  render(
    <MemoryRouter>
      <ScorecardTemplatePage />
    </MemoryRouter>,
  )

describe('ScorecardTemplatePage', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.clearAllMocks()
    templateConflict = false
  })

  test('shows no-template state and lets a manager create a draft', async () => {
    ready(null)
    renderPage()
    expect(screen.getByText('No scorecard configured')).toBeInTheDocument()
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Create Scorecard' }))
    expect(createMutate).toHaveBeenCalledWith(undefined)
  })

  test('keeps the template read-only for a viewing hiring manager', () => {
    ready({ activeVersion: { ...draft, status: 'PUBLISHED' }, draft: null })
    organizationQuery.mockReturnValue({
      data: { permissions: ['scorecard-template:view'] },
      isPending: false,
    })
    renderPage()
    expect(screen.getByText('Published v1')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /create new draft/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /save draft/i }),
    ).not.toBeInTheDocument()
  })

  test('edits criteria, exposes accessible reorder controls, and confirms publish', async () => {
    ready({ activeVersion: null, draft })
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Add criterion' }))
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(3)
    await user.click(screen.getAllByRole('button', { name: 'Move down' })[0])
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[2])
    await user.click(screen.getByRole('button', { name: 'Save Draft' }))
    expect(updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        criteria: expect.arrayContaining([
          expect.objectContaining({ label: 'Two', position: 1 }),
        ]),
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  test('confirms publishing an unchanged draft with its revision', async () => {
    ready({ activeVersion: null, draft })
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Publish' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Publish scorecard?')
    await user.click(screen.getByRole('button', { name: 'Publish' }))
    expect(publishMutate).toHaveBeenCalledWith(
      { expectedRevision: 3 },
      expect.any(Object),
    )
  })

  test('requires an explicit reload after a template conflict', () => {
    ready({ activeVersion: null, draft })
    templateConflict = true
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent('updated elsewhere')
    expect(
      screen.getByRole('button', { name: 'Reload latest version' }),
    ).toBeInTheDocument()
  })

  test('retains local criteria edits through a background refetch and blocks a stale write', async () => {
    ready({ activeVersion: null, draft })
    const user = userEvent.setup()
    const view = renderPage()
    await user.type(screen.getByRole('textbox', { name: 'Title' }), ' revised')
    templateQuery.mockReturnValue({
      data: { activeVersion: null, draft: { ...draft, revision: 4 } },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    view.rerender(
      <MemoryRouter>
        <ScorecardTemplatePage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue(
      'Interview revised',
    )
    expect(screen.getByRole('alert')).toHaveTextContent('newer draft')
    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeDisabled()
    expect(updateMutate).not.toHaveBeenCalled()
  })

  test('accepts the saved server revision before a subsequent edit', async () => {
    ready({ activeVersion: null, draft })
    const user = userEvent.setup()
    const view = renderPage()
    await user.type(screen.getByRole('textbox', { name: 'Title' }), ' revised')
    await user.click(screen.getByRole('button', { name: 'Save Draft' }))
    const savedDraft = { ...draft, title: 'Interview revised', revision: 4 }
    templateQuery.mockReturnValue({
      data: { activeVersion: null, draft: savedDraft },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    await act(async () => {
      updateMutate.mock.calls[0][1].onSuccess({ draft: savedDraft })
    })
    view.rerender(
      <MemoryRouter>
        <ScorecardTemplatePage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Scorecard draft saved',
    )
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled()
    await user.type(screen.getByRole('textbox', { name: 'Title' }), ' again')
    await user.click(screen.getByRole('button', { name: 'Save Draft' }))
    expect(updateMutate.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        expectedRevision: 4,
        title: 'Interview revised again',
      }),
    )
  })

  test('keeps the confirmed publish revision if the query refetches while confirmation is open', async () => {
    ready({ activeVersion: null, draft })
    const user = userEvent.setup()
    const view = renderPage()
    await user.click(screen.getByRole('button', { name: 'Publish' }))
    templateQuery.mockReturnValue({
      data: { activeVersion: null, draft: { ...draft, revision: 4 } },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    view.rerender(
      <MemoryRouter>
        <ScorecardTemplatePage />
      </MemoryRouter>,
    )
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Publish',
      }),
    )
    expect(publishMutate).toHaveBeenCalledWith(
      { expectedRevision: 3 },
      expect.any(Object),
    )
  })
})
