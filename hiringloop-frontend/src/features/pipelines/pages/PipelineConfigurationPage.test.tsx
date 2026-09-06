import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  organization: vi.fn(),
  job: vi.fn(),
  pipeline: vi.fn(),
}))
vi.mock('../../organizations/hooks/queries', () => ({
  useOrganization: mocks.organization,
}))
vi.mock('../../jobs/hooks/queries', () => ({ useJob: mocks.job }))
vi.mock('../hooks/queries', () => ({ usePipeline: mocks.pipeline }))
vi.mock('../hooks/mutations', () => ({
  useCreatePipelineStage: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useRenamePipelineStage: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useReorderPipelineStages: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useDeletePipelineStage: () => ({ isPending: false, mutateAsync: vi.fn() }),
}))

import { PipelineConfigurationPage } from './PipelineConfigurationPage'

const stages = [
  { id: 'entry', name: 'Applied', kind: 'ENTRY' as const, position: 1 },
  { id: 'screen', name: 'Screening', kind: 'STANDARD' as const, position: 2 },
  { id: 'offer', name: 'Offer', kind: 'STANDARD' as const, position: 3 },
]
function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/app/organizations/org-1/jobs/job-1/pipeline']}
    >
      <Routes>
        <Route
          path="/app/organizations/:organizationId/jobs/:jobId/pipeline"
          element={<PipelineConfigurationPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}
function ready(permissions: string[], status = 'DRAFT') {
  mocks.organization.mockReturnValue({
    isPending: false,
    isError: false,
    data: { permissions },
  })
  mocks.job.mockReturnValue({
    isPending: false,
    isError: false,
    data: { title: 'Engineer', status },
    refetch: vi.fn(),
  })
  mocks.pipeline.mockReturnValue({
    isPending: false,
    isError: false,
    data: { version: 4, stages },
    refetch: vi.fn(),
  })
}
beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset())
})
afterEach(cleanup)

describe('Pipeline Configuration page', () => {
  test('renders server order and configuration controls for configurators', () => {
    ready(['pipeline:view', 'pipeline:configure'])
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Pipeline Configuration' }),
    ).toBeVisible()
    expect(
      screen.getAllByRole('listitem').map((item) => item.textContent),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Applied'),
        expect.stringContaining('Screening'),
        expect.stringContaining('Offer'),
      ]),
    )
    expect(screen.getByText('Entry stage')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Add stage' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Delete Applied' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Move Screening down' }),
    ).toBeVisible()
  })

  test('keeps view-only users read-only', () => {
    ready(['pipeline:view'])
    renderPage()
    expect(
      screen.getByText('You have view-only access to this pipeline.'),
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Add stage' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit Screening' }),
    ).not.toBeInTheDocument()
  })

  test('renders a pipeline-shaped loading state', () => {
    mocks.organization.mockReturnValue({ isPending: true, isError: false })
    mocks.job.mockReturnValue({ isPending: true, isError: false })
    mocks.pipeline.mockReturnValue({ isPending: true, isError: false })
    renderPage()
    expect(
      screen.getByLabelText('Loading pipeline configuration'),
    ).toBeVisible()
  })
})
