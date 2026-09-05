import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type { JobDetailDto } from '../types/job.types'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  transition: vi.fn(),
}))

vi.mock('../hooks/mutations', () => ({
  useCreateJob: () => ({ mutateAsync: mocks.create, isPending: false }),
  useTransitionJob: () => ({
    mutateAsync: mocks.transition,
    isPending: false,
  }),
}))

vi.mock('../../organizations/hooks/queries', () => ({
  useOrganization: () => ({
    isPending: false,
    isError: false,
    data: { permissions: ['job:create'] },
  }),
}))

import { CreateJobPage } from './CreateJobPage'

const organizationId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0001'
const jobId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0002'
const job: JobDetailDto = {
  id: jobId,
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
  version: 1,
  createdAt: '2026-09-05T00:00:00.000Z',
  updatedAt: '2026-09-05T00:00:00.000Z',
}

function Destination() {
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice
  return <div>{`${location.pathname}|${notice ?? ''}`}</div>
}

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[`/app/organizations/${organizationId}/jobs/new`]}
    >
      <Routes>
        <Route
          path="/app/organizations/:organizationId/jobs/new"
          element={<CreateJobPage />}
        />
        <Route
          path="/app/organizations/:organizationId/jobs/:jobId"
          element={<Destination />}
        />
        <Route
          path="/app/organizations/:organizationId/jobs/:jobId/edit"
          element={<Destination />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

async function completeReadyJob() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Job title'), 'Engineer')
  await user.selectOptions(
    screen.getByLabelText('Employment type'),
    'FULL_TIME',
  )
  await user.selectOptions(screen.getByLabelText('Workplace type'), 'REMOTE')
  await user.type(screen.getByLabelText('Description'), 'Build things')
  return user
}

beforeEach(() => {
  mocks.create.mockReset()
  mocks.transition.mockReset()
})
afterEach(cleanup)

describe('Create Job navigation', () => {
  test('saves one Draft and navigates to its organization-scoped detail route', async () => {
    mocks.create.mockResolvedValue(job)
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    await screen.findByText(
      `/app/organizations/${organizationId}/jobs/${jobId}|`,
    )
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.transition).not.toHaveBeenCalled()
  })

  test('creates once, opens once, and navigates to detail', async () => {
    mocks.create.mockResolvedValue(job)
    mocks.transition.mockResolvedValue({ ...job, status: 'OPEN', version: 2 })
    renderPage()
    const user = await completeReadyJob()

    await user.click(screen.getByRole('button', { name: 'Save & open' }))

    await screen.findByText(
      `/app/organizations/${organizationId}/jobs/${jobId}|`,
    )
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.transition).toHaveBeenCalledTimes(1)
    expect(mocks.transition).toHaveBeenCalledWith({
      action: 'open',
      expectedVersion: 1,
      targetJobId: jobId,
    })
  })

  test('keeps the created Draft and routes to edit when opening fails', async () => {
    mocks.create.mockResolvedValue(job)
    mocks.transition.mockRejectedValue(new Error('open failed'))
    renderPage()
    const user = await completeReadyJob()

    await user.click(screen.getByRole('button', { name: 'Save & open' }))

    await waitFor(() =>
      expect(
        screen.getByText(/draft was saved, but it could not be opened/i),
      ).toHaveTextContent(
        `/app/organizations/${organizationId}/jobs/${jobId}/edit`,
      ),
    )
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.transition).toHaveBeenCalledTimes(1)
  })
})
