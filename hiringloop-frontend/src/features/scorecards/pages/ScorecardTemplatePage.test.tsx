import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/apiErrors'
import { ScorecardTemplatePage } from './ScorecardTemplatePage'

const templateQuery = vi.fn()
const organizationQuery = vi.fn()
const createMutate = vi.fn()
const updateMutate = vi.fn()
const publishMutate = vi.fn()
let templateConflict = false

vi.mock('react-router-dom', () => ({
  useParams: () => ({ organizationId: 'org', jobId: 'job' }),
}))
vi.mock('../../organizations/hooks/queries', () => ({
  useOrganization: () => organizationQuery(),
}))
vi.mock('../hooks/queries', () => ({
  useScorecardTemplate: () => templateQuery(),
}))
vi.mock('../hooks/mutations', () => ({
  useCreateDraft: () => ({ mutate: createMutate, isPending: false }),
  useUpdateDraft: () => ({
    mutate: updateMutate,
    isPending: false,
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

describe('ScorecardTemplatePage', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.clearAllMocks()
    templateConflict = false
  })

  test('shows no-template state and lets a manager create a draft', async () => {
    ready(null)
    render(<ScorecardTemplatePage />)
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
    render(<ScorecardTemplatePage />)
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
    render(<ScorecardTemplatePage />)
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
    )
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
    render(<ScorecardTemplatePage />)
    expect(screen.getByRole('alert')).toHaveTextContent('updated elsewhere')
    expect(
      screen.getByRole('button', { name: 'Reload latest version' }),
    ).toBeInTheDocument()
  })
})
