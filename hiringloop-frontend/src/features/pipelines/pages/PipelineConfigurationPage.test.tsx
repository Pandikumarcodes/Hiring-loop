import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  organization: vi.fn(),
  job: vi.fn(),
  pipeline: vi.fn(),
  create: vi.fn(),
  rename: vi.fn(),
  reorder: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('../../organizations/hooks/queries', () => ({
  useOrganization: mocks.organization,
}))
vi.mock('../../jobs/hooks/queries', () => ({ useJob: mocks.job }))
vi.mock('../hooks/queries', () => ({ usePipeline: mocks.pipeline }))
vi.mock('../hooks/mutations', () => ({
  useCreatePipelineStage: () => ({
    isPending: false,
    mutateAsync: mocks.create,
  }),
  useRenamePipelineStage: () => ({
    isPending: false,
    mutateAsync: mocks.rename,
  }),
  useReorderPipelineStages: () => ({
    isPending: false,
    mutateAsync: mocks.reorder,
  }),
  useDeletePipelineStage: () => ({
    isPending: false,
    mutateAsync: mocks.remove,
  }),
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
  for (const mutation of [
    mocks.create,
    mocks.rename,
    mocks.reorder,
    mocks.remove,
  ])
    mutation.mockResolvedValue({})
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

  test('adds and renames stages using the current pipeline version', async () => {
    const user = userEvent.setup()
    ready(['pipeline:view', 'pipeline:configure'])
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Add stage' }))
    expect(screen.getByRole('dialog', { name: 'Add stage' })).toBeVisible()
    await user.type(
      screen.getByRole('textbox', { name: /Stage name/ }),
      'Technical',
    )
    const dialog = screen.getByRole('dialog', { name: 'Add stage' })
    await user.click(within(dialog).getByRole('button', { name: 'Add stage' }))
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        name: 'Technical',
        expectedVersion: 4,
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Pipeline updated',
    )
    await user.click(screen.getByRole('button', { name: 'Edit Screening' }))
    await user.clear(screen.getByRole('textbox', { name: /Stage name/ }))
    await user.type(
      screen.getByRole('textbox', { name: /Stage name/ }),
      'Phone screen',
    )
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(mocks.rename).toHaveBeenCalledWith({
        stageId: 'screen',
        name: 'Phone screen',
        expectedVersion: 4,
      }),
    )
  })

  test('reorders by keyboard and confirms removal without changing the entry stage', async () => {
    const user = userEvent.setup()
    ready(['pipeline:view', 'pipeline:configure'])
    renderPage()
    const move = screen.getByRole('button', { name: 'Move Screening down' })
    move.focus()
    await user.keyboard('{Enter}')
    await waitFor(() =>
      expect(mocks.reorder).toHaveBeenCalledWith({
        stageIds: ['entry', 'offer', 'screen'],
        expectedVersion: 4,
      }),
    )
    expect(
      screen.queryByRole('button', { name: 'Delete Applied' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete Screening' }))
    expect(
      screen.getByRole('dialog', { name: /Delete.*Screening/ }),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Delete stage' }))
    await waitFor(() =>
      expect(mocks.remove).toHaveBeenCalledWith({
        stageId: 'screen',
        expectedVersion: 4,
      }),
    )
  })

  test('keeps the stage dialog and entered name after a rejected update', async () => {
    const user = userEvent.setup()
    ready(['pipeline:view', 'pipeline:configure'])
    mocks.create.mockRejectedValueOnce(new Error('offline'))
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Add stage' }))
    await user.type(
      screen.getByRole('textbox', { name: /Stage name/ }),
      'Technical',
    )
    await user.click(
      within(screen.getByRole('dialog', { name: 'Add stage' })).getByRole(
        'button',
        { name: 'Add stage' },
      ),
    )
    expect(await screen.findByRole('alert')).toBeVisible()
    expect(screen.getByRole('textbox', { name: /Stage name/ })).toHaveValue(
      'Technical',
    )
    expect(screen.getByRole('dialog', { name: 'Add stage' })).toBeVisible()
  })
})
