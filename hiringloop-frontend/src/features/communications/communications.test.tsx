import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ApiError } from '../../shared/lib/apiErrors'
const history = vi.hoisted(() => vi.fn())
const templates = vi.hoisted(() => vi.fn())
const templateMutations = vi.hoisted(() => vi.fn())
vi.mock('./hooks/queries', () => ({
  useCommunications: history,
  useCommunicationTemplates: templates,
}))
vi.mock('./hooks/mutations', () => ({
  useSendCommunication: () => ({
    isPending: false,
    isError: false,
    mutate: vi.fn(),
  }),
  useTemplateMutations: templateMutations,
}))
import { CommunicationSection } from './components/CommunicationSection'
describe('communication section', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })
  test('shows empty history and authorized send controls', () => {
    history.mockReturnValue({
      isPending: false,
      isError: false,
      data: { data: [], pagination: { page: 1, pageSize: 10 } },
    })
    templates.mockReturnValue({
      data: { data: [] },
      isPending: false,
      isError: false,
    })
    render(
      <CommunicationSection
        organizationId="org-1"
        applicationId="app-1"
        candidateEmail="candidate@example.test"
        enabled
      />,
    )
    expect(screen.getByRole('heading', { name: 'Communication' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Send Email' })).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'No candidate communications yet' }),
    ).toBeVisible()
  })
  test('does not expose controls when unauthorized', () => {
    render(
      <CommunicationSection
        organizationId="org-1"
        applicationId="app-1"
        candidateEmail="candidate@example.test"
        enabled={false}
      />,
    )
    expect(
      screen.queryByRole('heading', { name: 'Communication' }),
    ).not.toBeInTheDocument()
  })
  test('presents a template conflict returned by the server', async () => {
    const user = userEvent.setup()
    const update = {
      isPending: false,
      isError: true,
      error: new ApiError({
        kind: 'http',
        code: 'COMMUNICATION_TEMPLATE_CONFLICT',
        message: 'Template was changed or not found',
        status: 409,
      }),
      mutate: vi.fn(),
    }
    history.mockReturnValue({
      isPending: false,
      isError: false,
      data: { data: [], pagination: { page: 1, pageSize: 10 } },
    })
    templates.mockReturnValue({
      data: {
        data: [
          {
            id: 'template-1',
            organizationId: 'org-1',
            name: 'Offer',
            subject: 'Your offer',
            body: 'Congratulations',
            revision: 2,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      isPending: false,
      isError: false,
    })
    templateMutations.mockReturnValue({
      create: { isPending: false, isError: false, mutate: vi.fn() },
      update,
      remove: { isPending: false, isError: false, mutate: vi.fn() },
    })

    render(
      <CommunicationSection
        organizationId="org-1"
        applicationId="app-1"
        candidateEmail="candidate@example.test"
        enabled
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Manage templates' }))
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/changed elsewhere/i)
  })
})
