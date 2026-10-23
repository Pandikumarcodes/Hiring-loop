import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'

import type { OrganizationDto } from './types/organization.types'

const useOrganizationsMock = vi.hoisted(() => vi.fn())
const useOrganizationMock = vi.hoisted(() => vi.fn())
const useCreateOrganizationMock = vi.hoisted(() => vi.fn())
vi.mock('./hooks/queries', () => ({
  useOrganizations: useOrganizationsMock,
  useOrganization: useOrganizationMock,
}))
vi.mock('./hooks/mutations', () => ({
  useCreateOrganization: useCreateOrganizationMock,
}))

import { OrganizationLandingPage } from './pages/OrganizationLandingPage'
import { OrganizationOnboardingPage } from './pages/OrganizationOnboardingPage'
import { OrganizationSwitcher } from './components/OrganizationSwitcher'
import { OrganizationWorkspacePage } from './pages/OrganizationWorkspacePage'

const one: OrganizationDto = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Acme Hiring',
  slug: 'acme-hiring',
  website: null,
  description: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}
const two = {
  ...one,
  id: '123e4567-e89b-12d3-a456-426614174001',
  name: 'Second Workspace',
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function successList(data: readonly OrganizationDto[]) {
  return { data, isPending: false, isError: false, refetch: vi.fn() }
}

function CurrentPath() {
  return <output data-testid="current-path">{useLocation().pathname}</output>
}

describe('organization experience', () => {
  test('single-workspace menu reveals the full long name and creation action', async () => {
    const user = userEvent.setup()
    const name = 'International recruiting and platform engineering '.repeat(6)
    useOrganizationsMock.mockReturnValue(successList([{ ...one, name }]))
    useOrganizationMock.mockReturnValue({
      isSuccess: true,
      data: { ...one, name },
    })
    render(
      <MemoryRouter initialEntries={[`/app/organizations/${one.id}`]}>
        <OrganizationSwitcher compact />
        <CurrentPath />
      </MemoryRouter>,
    )
    const trigger = screen.getByRole('button', {
      name: `Switch workspace: ${name.trim()}`,
    })
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
    trigger.focus()
    await user.keyboard('{Enter}')
    const item = screen.getByRole('menuitem', {
      name: /International recruiting/,
    })
    expect(item).toHaveAttribute('aria-current', 'true')
    expect(
      screen.getByText(name.trim(), { selector: '[role="menuitem"] span' }),
    ).not.toHaveClass('truncate')
    await user.click(screen.getByRole('menuitem', { name: 'Create workspace' }))
    expect(screen.getByTestId('current-path')).toHaveTextContent(
      '/app/organizations/new',
    )
  })
  test('routes an empty organization list to onboarding', async () => {
    useOrganizationsMock.mockReturnValue(successList([]))
    useCreateOrganizationMock.mockReturnValue({
      isPending: false,
      isError: false,
      mutateAsync: vi.fn(),
      reset: vi.fn(),
    })
    render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route path="/app" element={<OrganizationLandingPage />} />
          <Route
            path="/app/organizations/new"
            element={<OrganizationOnboardingPage />}
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(
      await screen.findByRole('heading', {
        name: 'Create your first organization',
      }),
    ).toBeVisible()
  })

  test('validates the required name and preserves optional fields during create', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue(one)
    useCreateOrganizationMock.mockReturnValue({
      isPending: false,
      isError: false,
      mutateAsync,
      reset: vi.fn(),
    })
    render(
      <MemoryRouter>
        <OrganizationOnboardingPage />
      </MemoryRouter>,
    )
    await user.click(
      screen.getByRole('button', { name: 'Create organization' }),
    )
    expect(screen.getByText('Enter your organization name.')).toBeVisible()
    await user.type(
      screen.getByRole('textbox', { name: 'Organization name' }),
      'Acme Hiring',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Website' }),
      'https://acme.test',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      'Hiring team',
    )
    await user.click(
      screen.getByRole('button', { name: 'Create organization' }),
    )
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        name: 'Acme Hiring',
        website: 'https://acme.test',
        description: 'Hiring team',
      }),
    )
  })

  test('uses additional-organization copy for an existing member', () => {
    useCreateOrganizationMock.mockReturnValue({
      isPending: false,
      isError: false,
      mutateAsync: vi.fn(),
      reset: vi.fn(),
    })
    render(
      <MemoryRouter>
        <OrganizationOnboardingPage organizationCount={1} />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { name: 'Create a new organization' }),
    ).toBeVisible()
  })

  test('shows a current organization and supports switching', async () => {
    const user = userEvent.setup()
    useOrganizationsMock.mockReturnValue(successList([one, two]))
    useOrganizationMock.mockReturnValue({
      isPending: false,
      isSuccess: true,
      isError: false,
      data: one,
    })
    render(
      <MemoryRouter initialEntries={[`/app/organizations/${one.id}`]}>
        <OrganizationSwitcher />
        <CurrentPath />
      </MemoryRouter>,
    )
    const trigger = screen.getByRole('button', {
      name: 'Switch workspace: Acme Hiring',
    })
    await user.click(trigger)
    expect(
      screen.getByRole('menuitem', { name: /Acme Hiring/ }),
    ).toHaveAttribute('aria-current', 'true')
    expect(
      screen.getByRole('menuitem', { name: 'Create workspace' }),
    ).toHaveAttribute('href', '/app/organizations/new')
    await user.click(screen.getByRole('menuitem', { name: 'Second Workspace' }))
    expect(screen.getByTestId('current-path')).toHaveTextContent(
      `/app/organizations/${two.id}`,
    )
  })

  test('renders a safe unavailable state for a valid but inaccessible organization', () => {
    useOrganizationsMock.mockReturnValue(successList([one]))
    useOrganizationMock.mockReturnValue({
      isPending: false,
      isError: true,
      refetch: vi.fn(),
    })
    render(
      <MemoryRouter initialEntries={[`/app/organizations/${one.id}`]}>
        <Routes>
          <Route
            path="/app/organizations/:organizationId"
            element={<OrganizationWorkspacePage />}
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { name: 'Organization unavailable' }),
    ).toBeVisible()
    expect(
      screen.getByText(
        "You don't have access to this organization, or it may no longer be available.",
      ),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Go to my organization' }),
    ).toHaveAttribute('href', `/app/organizations/${one.id}`)
  })

  test('does not show stale membership context for an inaccessible route', () => {
    useOrganizationsMock.mockReturnValue(successList([one, two]))
    useOrganizationMock.mockReturnValue({
      isPending: false,
      isError: true,
      isSuccess: false,
      refetch: vi.fn(),
    })
    render(
      <MemoryRouter initialEntries={[`/app/organizations/${two.id}`]}>
        <Routes>
          <Route
            path="/app/organizations/:organizationId"
            element={
              <>
                <OrganizationSwitcher />
                <OrganizationWorkspacePage />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Organization unavailable')).toBeVisible()
    expect(screen.queryByTitle(one.name)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Switch workspace: Choose a workspace',
      }),
    ).toBeVisible()
  })
})
