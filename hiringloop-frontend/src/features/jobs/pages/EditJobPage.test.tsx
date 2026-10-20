import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { JobDetailDto } from '../types/job.types'
import { EditJobPage } from './EditJobPage'

const mocks = vi.hoisted(() => ({
  organization: vi.fn(),
  job: vi.fn(),
  update: vi.fn(),
  refetch: vi.fn(),
  reset: vi.fn(),
}))
vi.mock('../../organizations/hooks/queries', () => ({
  useOrganization: mocks.organization,
}))
vi.mock('../hooks/queries', () => ({ useJob: mocks.job }))
vi.mock('../hooks/mutations', () => ({
  useUpdateJob: () => ({
    mutateAsync: mocks.update,
    isPending: false,
    error: null,
    reset: mocks.reset,
  }),
}))

const job: JobDetailDto = {
  id: 'job',
  title: 'Engineer',
  department: null,
  employmentType: 'FULL_TIME',
  workplaceType: 'REMOTE',
  location: null,
  description: 'Build things',
  openings: 1,
  status: 'DRAFT',
  openedAt: null,
  closedAt: null,
  archivedAt: null,
  version: 4,
  createdAt: '2026-09-05T00:00:00.000Z',
  updatedAt: '2026-09-05T00:00:00.000Z',
}
const route = () => (
  <MemoryRouter initialEntries={['/app/organizations/org/jobs/job/edit']}>
    <Routes>
      <Route
        path="/app/organizations/:organizationId/jobs/:jobId/edit"
        element={<EditJobPage />}
      />
    </Routes>
  </MemoryRouter>
)
function ready(value = job, permissions = ['job:update']) {
  mocks.organization.mockReturnValue({
    data: { permissions },
    isPending: false,
    isError: false,
  })
  mocks.job.mockReturnValue({
    data: value,
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
  })
}
beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset())
  ready()
})
afterEach(cleanup)

describe('EditJobPage', () => {
  test('keeps local edits and the original version during a background refetch', async () => {
    const user = userEvent.setup()
    mocks.update.mockRejectedValue(new Error('offline'))
    const view = render(route())
    const title = await screen.findByLabelText(/Job title/)
    await user.clear(title)
    await user.type(title, 'Senior Engineer')
    ready({ ...job, title: 'Changed elsewhere', version: 5 })
    view.rerender(route())
    expect(screen.getByLabelText(/Job title/)).toHaveValue('Senior Engineer')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Senior Engineer',
          expectedVersion: 4,
        }),
      ),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not save your changes.',
    )
    expect(
      screen.getByRole('link', { name: 'Changed elsewhere' }),
    ).toHaveAttribute('href', '/app/organizations/org/jobs/job')
  })

  test('denies direct editing without job:update', () => {
    ready(job, [])
    render(route())
    expect(
      screen.getByText(
        'You do not have permission to edit jobs in this workspace.',
      ),
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Save changes' }),
    ).not.toBeInTheDocument()
  })
})
