import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/apiErrors'

const useOfferMock = vi.hoisted(() => vi.fn())
const useOfferActionsMock = vi.hoisted(() => vi.fn())
vi.mock('../hooks/queries', () => ({ useOffer: useOfferMock }))
vi.mock('../hooks/mutations', () => ({ useOfferActions: useOfferActionsMock }))
import { OfferSection } from './OfferSection'

const offer = (
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' = 'DRAFT',
) => ({
  id: 'offer-1',
  applicationId: 'app-1',
  status,
  revision: 4,
  sentAt: null,
  acceptedAt: null,
  declinedAt: null,
  withdrawnAt: null,
  currentVersion: {
    id: 'version-1',
    versionNumber: 2,
    jobTitle: 'Engineer',
    currency: 'USD',
    baseCompensationMinor: '125000',
    bonusCompensationMinor: '5000',
    additionalCompensationText: null,
    startDate: null,
    expirationDate: null,
    location: null,
    workplaceType: null,
    additionalTerms: null,
    revision: 1,
    issuedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  versions: [],
})
const mutation = (extra = {}) => ({
  isPending: false,
  isError: false,
  mutate: vi.fn(),
  ...extra,
})
const actions = (delivery?: 'PENDING' | 'SENT' | 'FAILED', extra = {}) => ({
  create: mutation(),
  edit: mutation(extra),
  revise: mutation(),
  transition: mutation(),
  outcome: mutation(),
  send: mutation({ data: delivery ? { status: delivery } : undefined }),
})
const renderSection = (permissions = ['offer:view', 'offer:create']) =>
  render(
    <OfferSection
      organizationId="org-1"
      applicationId="app-1"
      permissions={permissions}
    />,
  )

describe('OfferSection', () => {
  beforeEach(() => {
    useOfferMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
    })
    useOfferActionsMock.mockReturnValue(actions())
  })
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })
  test('shows loading and empty offer states', () => {
    useOfferMock.mockReturnValue({ isPending: true, isError: false })
    renderSection()
    expect(screen.getByText(/loading offer/i)).toBeInTheDocument()
    cleanup()
    useOfferMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
    })
    renderSection()
    expect(screen.getByText('No offer created.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create offer' })).toBeEnabled()
  })
  test('creates an offer through labelled keyboard-accessible fields', async () => {
    const user = userEvent.setup()
    const a = actions()
    useOfferActionsMock.mockReturnValue(a)
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Create offer' }))
    expect(
      screen.getByRole('dialog', { name: 'Create offer' }),
    ).toBeInTheDocument()
    await user.type(screen.getByLabelText(/job title/i), 'Staff Engineer')
    await user.clear(screen.getByLabelText(/base compensation/i))
    await user.type(screen.getByLabelText(/base compensation/i), '250000')
    await user.click(screen.getByRole('button', { name: 'Save offer' }))
    expect(a.create.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        jobTitle: 'Staff Engineer',
        baseCompensationMinor: '250000',
      }),
      expect.any(Object),
    )
  })
  test('edits a draft with revision protection and announces stale conflicts', async () => {
    const user = userEvent.setup()
    const a = actions(undefined, {
      isError: true,
      error: new ApiError({
        kind: 'response',
        code: 'CONFLICT',
        message: 'Conflict',
        status: 409,
      }),
    })
    useOfferMock.mockReturnValue({
      data: offer(),
      isPending: false,
      isError: false,
    })
    useOfferActionsMock.mockReturnValue(a)
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Edit draft' }))
    expect(
      screen.getByRole('dialog', { name: 'Edit draft offer' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/changed elsewhere/i)
    await user.click(screen.getByRole('button', { name: 'Save offer' }))
    expect(a.edit.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'offer-1', expectedRevision: 4 }),
      expect.any(Object),
    )
  })
  test('creates a revision from a sent offer', async () => {
    const user = userEvent.setup()
    const a = actions()
    useOfferMock.mockReturnValue({
      data: offer('SENT'),
      isPending: false,
      isError: false,
    })
    useOfferActionsMock.mockReturnValue(a)
    renderSection()
    await user.click(screen.getByRole('button', { name: 'New revision' }))
    expect(
      screen.getByRole('dialog', { name: 'Create offer revision' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save offer' }))
    expect(a.revise.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'offer-1', expectedRevision: 4 }),
      expect.any(Object),
    )
  })
  test.each(['PENDING', 'SENT', 'FAILED'] as const)(
    'renders %s delivery distinctly from lifecycle',
    (delivery) => {
      useOfferMock.mockReturnValue({
        data: offer('SENT'),
        isPending: false,
        isError: false,
      })
      useOfferActionsMock.mockReturnValue(actions(delivery))
      renderSection()
      expect(screen.getAllByText('SENT').length).toBeGreaterThan(0)
      expect(
        delivery === 'PENDING'
          ? screen.getByText(/PENDING.*delivery unconfirmed/)
          : screen.getAllByText(delivery).at(-1),
      ).toBeInTheDocument()
    },
  )
  test('sends, accepts, declines, and withdraws through named confirmation dialogs', async () => {
    const user = userEvent.setup()
    const a = actions()
    useOfferActionsMock.mockReturnValue(a)
    useOfferMock.mockReturnValue({
      data: offer(),
      isPending: false,
      isError: false,
    })
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Send offer' }))
    expect(
      screen.getByRole('dialog', { name: 'Send offer?' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send offer' }))
    expect(a.send.mutate).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    cleanup()
    useOfferMock.mockReturnValue({
      data: offer('SENT'),
      isPending: false,
      isError: false,
    })
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Record accepted' }))
    await user.click(screen.getByRole('button', { name: 'Record accept' }))
    expect(a.transition.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'accept' }),
      expect.any(Object),
    )
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Record declined' }))
    await user.click(screen.getByRole('button', { name: 'Record decline' }))
    expect(a.transition.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'decline' }),
      expect.any(Object),
    )
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Withdraw' }))
    expect(
      screen.getByRole('dialog', { name: 'Withdraw offer?' }),
    ).toHaveTextContent(/withdraw/i)
    await user.click(screen.getByRole('button', { name: 'Record withdraw' }))
    expect(a.transition.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'withdraw' }),
      expect.any(Object),
    )
  })
  test('hides terminal actions and formats minor-unit compensation', () => {
    useOfferMock.mockReturnValue({
      data: offer('ACCEPTED'),
      isPending: false,
      isError: false,
    })
    renderSection()
    expect(
      screen.queryByRole('button', {
        name: /edit draft|send offer|withdraw|record/i,
      }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/1,25,000/)).toBeInTheDocument()
    expect(screen.getByText(/^\$5,000$/)).toBeInTheDocument()
  })
  test('does not query or render confidential offer UI without offer:view', () => {
    renderSection([])
    expect(useOfferMock).toHaveBeenCalledWith('org-1', 'app-1', false)
    expect(screen.queryByText('Offer')).not.toBeInTheDocument()
    expect(screen.queryByText(/compensation/i)).not.toBeInTheDocument()
  })
})
