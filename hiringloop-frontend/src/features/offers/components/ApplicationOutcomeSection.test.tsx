import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/apiErrors'

const useOfferMock = vi.hoisted(() => vi.fn())
const useOfferActionsMock = vi.hoisted(() => vi.fn())
const usePoolsMock = vi.hoisted(() => vi.fn())
vi.mock('../hooks/queries', () => ({ useOffer: useOfferMock }))
vi.mock('../hooks/mutations', () => ({ useOfferActions: useOfferActionsMock }))
vi.mock('../../talent-pools/hooks/queries', () => ({ usePools: usePoolsMock }))
import { ApplicationOutcomeSection } from './ApplicationOutcomeSection'

const application = (
  outcome: 'ACTIVE' | 'HIRED' | 'REJECTED' = 'ACTIVE',
  history = [] as any[],
) => ({
  id: 'app-1',
  submittedAt: '',
  formVersionId: '',
  candidate: { id: 'candidate-1', name: 'Alice', email: 'a@test', phone: null },
  job: { id: 'job-1', title: 'Role' },
  currentStage: { id: 'stage-1', name: 'Interview' },
  outcome,
  outcomeRevision: 3,
  outcomeUpdatedAt: undefined,
  outcomeHistory: history,
  answers: [],
  documents: [],
  stageHistory: [],
})
const outcome = (extra = {}) => ({
  isPending: false,
  isError: false,
  mutate: vi.fn(),
  ...extra,
})
const actionSet = (extra = {}) => ({
  outcome: outcome(extra),
  send: outcome(),
  create: outcome(),
  edit: outcome(),
  revise: outcome(),
  transition: outcome(),
})
const renderSection = (
  app = application(),
  permissions = ['application:hire', 'offer:view', 'talent-pool:view'],
) =>
  render(
    <ApplicationOutcomeSection
      organizationId="org-1"
      application={app as any}
      permissions={permissions}
    />,
  )

describe('ApplicationOutcomeSection', () => {
  beforeEach(() => {
    useOfferMock.mockReturnValue({ data: undefined })
    useOfferActionsMock.mockReturnValue(actionSet())
    usePoolsMock.mockReturnValue({
      data: { pools: [{ id: 'pool-1', name: 'Future hires' }] },
    })
  })
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })
  test('shows ACTIVE state, stage separation, and accepted-offer prerequisite UX', () => {
    renderSection()
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
    expect(
      screen.getByText(/separate from the pipeline stage/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hire' })).toBeDisabled()
    expect(screen.getByText(/accepted/i)).toBeInTheDocument()
  })
  test('shows HIRED and REJECTED as terminal states with reopen control', () => {
    renderSection(application('HIRED'))
    expect(screen.getByText('HIRED')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeEnabled()
    cleanup()
    renderSection(application('REJECTED'))
    expect(screen.getByText('REJECTED')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeEnabled()
  })
  test('renders chronological history with rejection reason and details', () => {
    renderSection(
      application('REJECTED', [
        {
          id: 'first',
          type: 'REJECTED',
          reasonCode: 'QUALIFICATIONS',
          reasonDetails: 'Missing experience',
          occurredAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'second',
          type: 'REOPENED',
          reasonCode: null,
          reasonDetails: 'New evidence',
          occurredAt: '2026-02-01T00:00:00.000Z',
        },
      ]),
    )
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('QUALIFICATIONS')
    expect(items[0]).toHaveTextContent('Missing experience')
    expect(items[1]).toHaveTextContent('reopened')
    expect(items[1]).toHaveTextContent('New evidence')
  })
  test('hires only after accepted offer and handles prerequisite conflict', async () => {
    const user = userEvent.setup()
    const a = actionSet({
      isError: true,
      error: new ApiError({
        kind: 'response',
        code: 'APPLICATION_HIRE_REQUIRES_ACCEPTED_OFFER',
        message: 'Offer required',
      }),
    })
    useOfferActionsMock.mockReturnValue(a)
    useOfferMock.mockReturnValue({ data: { status: 'ACCEPTED' } })
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Hire' }))
    expect(
      screen.getByRole('dialog', { name: 'Mark candidate as hired?' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark hired' }))
    expect(a.outcome.mutate).toHaveBeenCalledWith(
      { action: 'hire', body: { expectedRevision: 3 } },
      expect.any(Object),
    )
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/accepted offer/i)
  })
  test('reject dialog has required reason, optional details, and optional pool selector', async () => {
    const user = userEvent.setup()
    const a = actionSet()
    useOfferActionsMock.mockReturnValue(a)
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Reject' }))
    expect(
      screen.getByRole('dialog', { name: 'Reject application' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/rejection reason/i)).toHaveValue(
      'QUALIFICATIONS',
    )
    expect(screen.getByLabelText('Talent Pool')).toHaveValue('')
    expect(
      screen.getByRole('option', { name: 'Do not add to Talent Pool' }),
    ).toBeInTheDocument()
    await user.selectOptions(
      screen.getByLabelText(/rejection reason/i),
      'INTERVIEW_FEEDBACK',
    )
    await user.type(screen.getByLabelText('Details'), 'Feedback summary')
    await user.click(screen.getByRole('button', { name: 'Reject application' }))
    expect(a.outcome.mutate).toHaveBeenCalledWith(
      {
        action: 'reject',
        body: {
          expectedRevision: 3,
          reasonCode: 'INTERVIEW_FEEDBACK',
          reasonDetails: 'Feedback summary',
        },
      },
      expect.any(Object),
    )
  })
  test('reject can place the candidate in a selected talent pool', async () => {
    const user = userEvent.setup()
    const a = actionSet()
    useOfferActionsMock.mockReturnValue(a)
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Reject' }))
    await user.selectOptions(screen.getByLabelText('Talent Pool'), 'pool-1')
    await user.click(screen.getByRole('button', { name: 'Reject application' }))
    expect(a.outcome.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ talentPoolId: 'pool-1' }),
      }),
      expect.any(Object),
    )
  })
  test('reopen requires an explanation and sends it with revision', async () => {
    const user = userEvent.setup()
    const a = actionSet()
    useOfferActionsMock.mockReturnValue(a)
    renderSection(application('HIRED'))
    await user.click(screen.getByRole('button', { name: 'Reopen' }))
    expect(
      screen.getByRole('dialog', { name: 'Reopen application' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Reopen application' }),
    ).toBeDisabled()
    await user.type(screen.getByLabelText(/reason/i), 'Role reopened')
    await user.click(screen.getByRole('button', { name: 'Reopen application' }))
    expect(a.outcome.mutate).toHaveBeenCalledWith(
      {
        action: 'reopen',
        body: { expectedRevision: 3, reasonDetails: 'Role reopened' },
      },
      expect.any(Object),
    )
  })
  test('announces outcome conflicts and denies controls without application permission', () => {
    useOfferActionsMock.mockReturnValue(
      actionSet({
        isError: true,
        error: new ApiError({
          kind: 'response',
          code: 'CONFLICT',
          message: 'Conflict',
          status: 409,
        }),
      }),
    )
    renderSection()
    expect(screen.getByRole('alert')).toHaveTextContent(/changed elsewhere/i)
    cleanup()
    renderSection(application(), [])
    expect(
      screen.queryByRole('button', { name: /hire|reject|reopen/i }),
    ).not.toBeInTheDocument()
  })
})
