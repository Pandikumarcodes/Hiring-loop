import { render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ApiError } from '../../../shared/lib/apiErrors'

const hooks = vi.hoisted(() => ({
  change: {
    isPending: false,
    isError: true,
    error: null as unknown,
    mutateAsync: vi.fn(),
  },
  remove: {
    isPending: false,
    isError: true,
    error: null as unknown,
    mutateAsync: vi.fn(),
  },
}))

vi.mock('react-router-dom', () => ({
  useParams: () => ({ organizationId: 'workspace-a' }),
}))
vi.mock('../../auth/hooks/queries', () => ({
  useCurrentUser: () => ({ user: { email: 'admin@example.com' } }),
}))
vi.mock('../hooks/queries', () => ({
  useMembers: () => ({
    isPending: false,
    isSuccess: true,
    isError: false,
    data: [
      {
        id: 'membership-1',
        role: 'ADMIN',
        joinedAt: '2026-01-01T00:00:00.000Z',
        user: { id: 'user-1', email: 'admin@example.com' },
      },
    ],
  }),
  useInvitations: () => ({
    isPending: false,
    isError: false,
    data: [],
  }),
}))
vi.mock('../hooks/mutations', () => ({
  useInviteMember: () => ({ isPending: false, isError: false }),
  useChangeMemberRole: () => hooks.change,
  useRemoveMember: () => hooks.remove,
  useRevokeInvitation: () => ({ isPending: false, isError: false }),
}))

import { TeamPage } from './TeamPage'

const finalAdminConflict = new ApiError({
  kind: 'http',
  status: 409,
  code: 'CONFLICT',
  message: 'The organization must retain at least one Admin',
})

beforeEach(() => {
  hooks.change.mutateAsync.mockReset().mockRejectedValue(finalAdminConflict)
  hooks.remove.mutateAsync.mockReset().mockRejectedValue(finalAdminConflict)
  hooks.change.error = finalAdminConflict
  hooks.remove.error = finalAdminConflict
})
afterEach(cleanup)

describe('TeamPage non-recoverable confirmation conflicts', () => {
  test('closes the final-Admin role dialog and keeps the server error visible', async () => {
    const user = userEvent.setup()
    render(<TeamPage />)

    await user.selectOptions(
      screen.getByRole('combobox', {
        name: 'Change role for admin@example.com',
      }),
      'RECRUITER',
    )
    await user.click(screen.getByRole('button', { name: 'Change role' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('alert')).toHaveTextContent('at least one Admin')
    expect(screen.getByText('Admin', { selector: 'span' })).toBeInTheDocument()
  })

  test('closes the final-Admin leave dialog and keeps the membership visible', async () => {
    const user = userEvent.setup()
    render(<TeamPage />)

    await user.click(
      screen.getAllByRole('button', { name: 'Leave workspace' })[0],
    )
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Leave workspace',
      }),
    )

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('alert')).toHaveTextContent('at least one Admin')
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
  })
})
