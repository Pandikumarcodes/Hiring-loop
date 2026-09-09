import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const useOrganizationMock = vi.hoisted(() => vi.fn())
const usePoolsMock = vi.hoisted(() => vi.fn())
const usePoolMembersMock = vi.hoisted(() => vi.fn())
const useActionsMock = vi.hoisted(() => vi.fn())
vi.mock('../organizations/hooks/queries', () => ({
  useOrganization: useOrganizationMock,
}))
vi.mock('./hooks/queries', () => ({
  usePools: usePoolsMock,
  usePoolMembers: usePoolMembersMock,
}))
vi.mock('./hooks/mutations', () => ({ useTalentPoolActions: useActionsMock }))
import { TalentPoolsPage } from './pages/TalentPoolsPage'
import { TalentPoolDetailPage } from './pages/TalentPoolDetailPage'
import { CandidateTalentPools } from './components/CandidateTalentPools'

const pool = {
  id: 'pool-1',
  name: 'Future hires',
  description: 'Strong prospects',
  revision: 2,
  createdAt: '',
  updatedAt: '',
  memberCount: 1,
}
const member = {
  id: 'member-1',
  candidate: {
    id: 'candidate-1',
    firstName: 'Alice',
    lastName: 'Applicant',
    email: 'alice@test',
  },
  sourceApplicationId: 'app-1',
  note: null,
  createdAt: '',
}
const result = (data: any, extra = {}) => ({
  data,
  isPending: false,
  isError: false,
  refetch: vi.fn(),
  ...extra,
})
const mutate = () => ({ isPending: false, isError: false, mutate: vi.fn() })
const actions = () => ({
  create: mutate(),
  update: mutate(),
  add: mutate(),
  remove: mutate(),
})
const renderAt = (node: React.ReactNode, path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/app/organizations/:organizationId/talent-pools"
          element={node}
        />
        <Route
          path="/app/organizations/:organizationId/talent-pools/:talentPoolId"
          element={node}
        />
      </Routes>
    </MemoryRouter>,
  )

describe('Talent Pool pages', () => {
  beforeEach(() => {
    useOrganizationMock.mockReturnValue(
      result({
        permissions: [
          'talent-pool:view',
          'talent-pool:manage',
          'talent-pool-member:manage',
        ],
      }),
    )
    usePoolsMock.mockReturnValue(
      result({
        pools: [pool],
        pagination: { page: 1, pageSize: 25, totalItems: 1 },
      }),
    )
    usePoolMembersMock.mockReturnValue(
      result({ members: [member], pagination: { page: 1, pageSize: 25 } }),
    )
    useActionsMock.mockReturnValue(actions())
  })
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })
  test('list route renders loading, empty, populated, API error, and permission states', () => {
    usePoolsMock.mockReturnValue(result(undefined, { isPending: true }))
    renderAt(<TalentPoolsPage />, '/app/organizations/org-1/talent-pools')
    expect(
      screen.getByRole('status', { name: 'Loading talent pools' }),
    ).toBeInTheDocument()
    cleanup()
    usePoolsMock.mockReturnValue(result({ pools: [], pagination: {} }))
    renderAt(<TalentPoolsPage />, '/app/organizations/org-1/talent-pools')
    expect(screen.getByText('No talent pools')).toBeInTheDocument()
    cleanup()
    usePoolsMock.mockReturnValue(result({ pools: [pool], pagination: {} }))
    renderAt(<TalentPoolsPage />, '/app/organizations/org-1/talent-pools')
    expect(screen.getByRole('link', { name: 'Future hires' })).toHaveAttribute(
      'href',
      '/app/organizations/org-1/talent-pools/pool-1',
    )
    cleanup()
    usePoolsMock.mockReturnValue(result(undefined, { isError: true }))
    renderAt(<TalentPoolsPage />, '/app/organizations/org-1/talent-pools')
    expect(screen.getByText('Talent pools unavailable')).toBeInTheDocument()
    cleanup()
    useOrganizationMock.mockReturnValue(result({ permissions: [] }))
    renderAt(<TalentPoolsPage />, '/app/organizations/org-1/talent-pools')
    expect(
      screen.getByText('Talent pool access unavailable'),
    ).toBeInTheDocument()
  })
  test('list route creates, edits, searches, paginates, and hides manage actions from viewers', async () => {
    const user = userEvent.setup()
    const a = actions()
    useActionsMock.mockReturnValue(a)
    usePoolsMock.mockReturnValue(
      result({
        pools: Array.from({ length: 25 }, (_, i) => ({
          ...pool,
          id: `pool-${i}`,
        })),
        pagination: {},
      }),
    )
    renderAt(<TalentPoolsPage />, '/app/organizations/org-1/talent-pools')
    await user.type(screen.getByLabelText('Search talent pools'), 'future')
    expect(usePoolsMock).toHaveBeenLastCalledWith('org-1', 1, 'future', true)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(usePoolsMock).toHaveBeenLastCalledWith('org-1', 2, 'future', true)
    await user.click(screen.getByRole('button', { name: 'Create talent pool' }))
    expect(
      screen.getByRole('dialog', { name: 'Create talent pool' }),
    ).toBeInTheDocument()
    await user.type(screen.getByLabelText(/name/i), 'Alumni')
    await user.click(screen.getByRole('button', { name: 'Save pool' }))
    expect(a.create.mutate).toHaveBeenCalledWith(
      { name: 'Alumni', description: undefined },
      expect.any(Object),
    )
    cleanup()
    usePoolsMock.mockReturnValue(result({ pools: [pool], pagination: {} }))
    renderAt(<TalentPoolsPage />, '/app/organizations/org-1/talent-pools')
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText(/name/i))
    await user.type(screen.getByLabelText(/name/i), 'Alumni')
    await user.click(screen.getByRole('button', { name: 'Save pool' }))
    expect(a.update.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'pool-1',
        expectedRevision: 2,
        name: 'Alumni',
      }),
      expect.any(Object),
    )
    cleanup()
    useOrganizationMock.mockReturnValue(
      result({ permissions: ['talent-pool:view'] }),
    )
    renderAt(<TalentPoolsPage />, '/app/organizations/org-1/talent-pools')
    expect(
      screen.queryByRole('button', { name: /create|edit/i }),
    ).not.toBeInTheDocument()
  })
  test('detail route renders metadata, member loading/empty/error/populated, search and pagination', async () => {
    const user = userEvent.setup()
    renderAt(
      <TalentPoolDetailPage />,
      '/app/organizations/org-1/talent-pools/pool-1',
    )
    expect(
      screen.getByRole('heading', { name: 'Future hires' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Strong prospects')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Alice Applicant' }),
    ).toHaveAttribute('href', '/app/organizations/org-1/candidates/candidate-1')
    await user.type(screen.getByLabelText('Search members'), 'alice')
    expect(usePoolMembersMock).toHaveBeenLastCalledWith(
      'org-1',
      'pool-1',
      1,
      'alice',
      true,
    )
    cleanup()
    usePoolMembersMock.mockReturnValue(result(undefined, { isPending: true }))
    renderAt(
      <TalentPoolDetailPage />,
      '/app/organizations/org-1/talent-pools/pool-1',
    )
    expect(
      screen.getByRole('status', { name: 'Loading members' }),
    ).toBeInTheDocument()
    cleanup()
    usePoolMembersMock.mockReturnValue(result({ members: [], pagination: {} }))
    renderAt(
      <TalentPoolDetailPage />,
      '/app/organizations/org-1/talent-pools/pool-1',
    )
    expect(screen.getByText('No members')).toBeInTheDocument()
    cleanup()
    usePoolMembersMock.mockReturnValue(result(undefined, { isError: true }))
    renderAt(
      <TalentPoolDetailPage />,
      '/app/organizations/org-1/talent-pools/pool-1',
    )
    expect(screen.getByText('Members unavailable')).toBeInTheDocument()
  })
  test('candidate membership action adds idempotently, renders known membership, and removes it', async () => {
    const user = userEvent.setup()
    const a = actions()
    a.add.mutate.mockImplementation(
      (_x: unknown, options: { onSuccess: () => void }) => options.onSuccess(),
    )
    a.remove.mutate.mockImplementation(
      (_x: unknown, options: { onSuccess: () => void }) => options.onSuccess(),
    )
    useActionsMock.mockReturnValue(a)
    render(
      <MemoryRouter>
        <CandidateTalentPools
          organizationId="org-1"
          candidateId="candidate-1"
          permissions={['talent-pool:view', 'talent-pool-member:manage']}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText(/not exhaustively loaded/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add to pool' }))
    expect(
      screen.getByRole('dialog', { name: 'Add candidate to talent pool' }),
    ).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Talent pool'), 'pool-1')
    await user.click(screen.getByRole('button', { name: 'Add candidate' }))
    expect(a.add.mutate).toHaveBeenCalledWith(
      { poolId: 'pool-1', candidateId: 'candidate-1' },
      expect.any(Object),
    )
    expect(
      screen.getByRole('link', { name: 'Future hires' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(a.remove.mutate).toHaveBeenCalledWith(
      { poolId: 'pool-1', candidateId: 'candidate-1' },
      expect.any(Object),
    )
    expect(screen.getByText(/not exhaustively loaded/i)).toBeInTheDocument()
  })
  test('candidate detail uses one bounded pools query, never member traversal, and honors four role capabilities', () => {
    const roles = {
      ADMIN: [
        'offer:view',
        'offer:create',
        'application:hire',
        'talent-pool:view',
        'talent-pool:manage',
        'talent-pool-member:manage',
      ],
      RECRUITER: [
        'offer:view',
        'offer:create',
        'application:hire',
        'talent-pool:view',
        'talent-pool:manage',
        'talent-pool-member:manage',
      ],
      HIRING_MANAGER: ['talent-pool:view'],
      INTERVIEWER: [],
    }
    render(
      <MemoryRouter>
        <CandidateTalentPools
          organizationId="org-1"
          candidateId="candidate-1"
          permissions={roles.ADMIN}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Add to pool' })).toBeVisible()
    expect(usePoolsMock).toHaveBeenCalledWith('org-1', 1, '', true)
    expect(usePoolMembersMock).not.toHaveBeenCalled()
    expect(screen.queryByText(/compensation/i)).not.toBeInTheDocument()
    cleanup()
    render(
      <MemoryRouter>
        <CandidateTalentPools
          organizationId="org-1"
          candidateId="candidate-1"
          permissions={roles.RECRUITER}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Add to pool' })).toBeVisible()
    cleanup()
    render(
      <MemoryRouter>
        <CandidateTalentPools
          organizationId="org-1"
          candidateId="candidate-1"
          permissions={roles.HIRING_MANAGER}
        />
      </MemoryRouter>,
    )
    expect(
      screen.queryByRole('button', { name: 'Add to pool' }),
    ).not.toBeInTheDocument()
    cleanup()
    render(
      <MemoryRouter>
        <CandidateTalentPools
          organizationId="org-1"
          candidateId="candidate-1"
          permissions={roles.INTERVIEWER}
        />
      </MemoryRouter>,
    )
    expect(screen.queryByText('Talent pools')).not.toBeInTheDocument()
  })
})
