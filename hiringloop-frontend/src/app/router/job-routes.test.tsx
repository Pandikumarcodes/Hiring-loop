import { render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

vi.mock('./ProtectedRoute', () => ({ ProtectedRoute: () => <Outlet /> }))
vi.mock('../../layouts/AppLayout', () => ({ AppLayout: () => <Outlet /> }))
vi.mock('../../features/jobs', () => ({
  JobsPage: () => <h1>Jobs route</h1>,
  CreateJobPage: () => <h1>Create route</h1>,
  JobDetailPage: () => <h1>Detail route</h1>,
  EditJobPage: () => <h1>Edit route</h1>,
}))
vi.mock('../../features/organizations/hooks/queries', () => ({
  useOrganizations: () => ({ data: [] }),
}))

import { AppRoutes } from './routes'

afterEach(cleanup)

describe('Job route matching', () => {
  test.each([
    ['/app/organizations/org-1/jobs/new', 'Create route'],
    ['/app/organizations/org-1/jobs/job-1', 'Detail route'],
    ['/app/organizations/org-1/jobs/job-1/edit', 'Edit route'],
  ])('%s renders %s', (path, heading) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: heading })).toBeVisible()
  })
})
