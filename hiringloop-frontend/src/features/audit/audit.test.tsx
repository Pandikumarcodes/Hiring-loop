import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'

const useOrganizationMock = vi.hoisted(() => vi.fn())
const useAuditEventsMock = vi.hoisted(() => vi.fn())
const useAuditEventMock = vi.hoisted(() => vi.fn())
vi.mock('../organizations/hooks/queries', () => ({
  useOrganization: useOrganizationMock,
}))
vi.mock('./hooks/queries', () => ({
  useAuditEvents: useAuditEventsMock,
  useAuditEvent: useAuditEventMock,
}))

import { AuditPage } from './pages/AuditPage'

const event = {
  id: 'event-1',
  actorType: 'SYSTEM' as const,
  action: 'OFFER_SENT',
  resourceType: 'OFFER',
  resourceId: '1234567890',
  before: { role: 'Recruiter' },
  after: { role: 'Hiring Manager' },
  metadata: null,
  occurredAt: '2026-01-01T00:00:00.000Z',
  actor: null,
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function setup(list = [event]) {
  useOrganizationMock.mockReturnValue({
    isPending: false,
    isError: false,
    data: { permissions: ['audit:view'] },
  })
  useAuditEventsMock.mockReturnValue({
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    data: {
      auditEvents: list,
      pagination: {
        page: 1,
        pageSize: 25,
        totalItems: list.length,
        totalPages: 1,
      },
    },
  })
  useAuditEventMock.mockReturnValue({
    isPending: false,
    isError: false,
    data: event,
    refetch: vi.fn(),
  })
}

describe('AuditPage', () => {
  test('renders safe event fields, SYSTEM fallback, filters, and detail values', () => {
    setup()
    render(
      <MemoryRouter>
        <AuditPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Audit Log' })).toBeVisible()
    expect(screen.getByText('System')).toBeVisible()
    expect(screen.getByText('Offer sent')).toBeVisible()
    fireEvent.click(
      screen.getByRole('button', { name: 'Open details for Offer sent' }),
    )
    expect(
      screen.getByRole('dialog', { name: 'Audit event details' }),
    ).toBeVisible()
    expect(screen.getByText('Recruiter')).toBeVisible()
    expect(screen.getByText('Hiring Manager')).toBeVisible()
    expect(screen.getByText('None')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Action' }), {
      target: { value: 'JOB_OPENED' },
    })
    expect(useAuditEventsMock).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ action: 'JOB_OPENED' }),
      1,
      25,
      true,
    )
  })

  test('renders loading, empty, and denied states', () => {
    setup()
    useAuditEventsMock.mockReturnValue({ isPending: true, isError: false })
    render(
      <MemoryRouter>
        <AuditPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Loading audit events')
    cleanup()
    setup([])
    render(
      <MemoryRouter>
        <AuditPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('No audit events found')).toBeVisible()
    cleanup()
    useOrganizationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { permissions: [] },
    })
    render(
      <MemoryRouter>
        <AuditPage />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { name: 'Audit access unavailable' }),
    ).toBeVisible()
  })
})
