import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
const history = vi.hoisted(() => vi.fn())
const templates = vi.hoisted(() => vi.fn())
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
  useTemplateMutations: () => ({ create: {}, update: {}, remove: {} }),
}))
import { CommunicationSection } from './components/CommunicationSection'
describe('communication section', () => {
  afterEach(() => cleanup())
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
})
