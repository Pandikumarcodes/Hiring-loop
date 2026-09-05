import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { JobActions } from './components/JobActions'
import { JobsNavigationLink } from './components/JobsNavigationLink'
import type { JobListDto } from './types/job.types'

const job: JobListDto = {
  id: 'job-1',
  title: 'Engineer',
  department: null,
  employmentType: 'FULL_TIME',
  workplaceType: 'REMOTE',
  location: null,
  openings: 1,
  status: 'DRAFT',
  openedAt: null,
  closedAt: null,
  archivedAt: null,
  version: 1,
  createdAt: '2026-09-05T00:00:00.000Z',
  updatedAt: '2026-09-05T00:00:00.000Z',
}

afterEach(cleanup)

describe('Job permission-aware UX', () => {
  test('hides Jobs navigation without list permission', () => {
    const { rerender } = render(
      <MemoryRouter>
        <JobsNavigationLink permissions={[]} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('link', { name: 'Jobs' })).not.toBeInTheDocument()
    rerender(
      <MemoryRouter>
        <JobsNavigationLink permissions={['job:list']} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Jobs' })).toBeVisible()
  })

  test('hides Archive from Hiring Managers and shows it to Recruiters', async () => {
    const user = userEvent.setup()
    const shared = ['job:update', 'job:open', 'job:close', 'job:reopen']
    const props = { job, onAction: vi.fn(), onEdit: vi.fn() }
    const { rerender } = render(<JobActions {...props} permissions={shared} />)
    await user.click(
      screen.getByRole('button', { name: 'Actions for Engineer' }),
    )
    expect(
      screen.queryByRole('menuitem', { name: 'Archive' }),
    ).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    rerender(<JobActions {...props} permissions={[...shared, 'job:archive']} />)
    await user.click(
      screen.getByRole('button', { name: 'Actions for Engineer' }),
    )
    expect(screen.getByRole('menuitem', { name: 'Archive' })).toBeVisible()
  })
})
