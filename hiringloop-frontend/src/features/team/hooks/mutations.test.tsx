import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ApiError } from '../../../shared/lib/apiErrors'
import { createTestQueryClient } from '../../../tests/query-client'
import { teamKeys } from './query-keys'

const apiMocks = vi.hoisted(() => ({
  createInvitation: vi.fn(),
  removeMember: vi.fn(),
  revokeInvitation: vi.fn(),
  updateMemberRole: vi.fn(),
  acceptInvitation: vi.fn(),
}))

vi.mock('../api/team.api', () => apiMocks)
vi.mock('../../auth/hooks/authenticated-mutation', () => ({
  runAuthenticatedAuthMutation: vi.fn((_client, mutation) => mutation('csrf')),
}))

import { useInviteMember } from './mutations'

function testContext() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

beforeEach(() => {
  Object.values(apiMocks).forEach((mock) => mock.mockReset())
})

describe('team mutations', () => {
  test('refetches only the current organization invitations after delivery failure', async () => {
    const organizationId = 'workspace-a'
    const error = new ApiError({
      kind: 'http',
      status: 503,
      code: 'EMAIL_DELIVERY_FAILED',
      message: 'Invitation email could not be sent',
    })
    apiMocks.createInvitation.mockRejectedValue(error)
    const { queryClient, wrapper } = testContext()
    const invalidate = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue()
    const { result } = renderHook(() => useInviteMember(organizationId), {
      wrapper,
    })

    await expect(
      act(() =>
        result.current.mutateAsync({
          email: 'person@example.com',
          role: 'RECRUITER',
        }),
      ),
    ).rejects.toBe(error)

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: teamKeys.invitations(organizationId),
      exact: true,
    })
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: teamKeys.invitations('workspace-b'),
      exact: true,
    })
  })
})
