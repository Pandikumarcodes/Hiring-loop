import { describe, expect, test, vi } from 'vitest'

const apiRequestMock = vi.hoisted(() => vi.fn())
vi.mock('../../../shared/lib/apiClient', () => ({
  apiRequest: apiRequestMock,
}))

import { acceptInvitation } from './team.api'

describe('invitation API', () => {
  test('posts the raw token to the unscoped versioned acceptance route', async () => {
    apiRequestMock.mockResolvedValue({
      data: {
        organization: { id: 'organization-1' },
        membership: {
          id: 'membership-1',
          organizationId: 'organization-1',
          role: 'RECRUITER',
        },
      },
    })

    await acceptInvitation('RAW_TOKEN', 'csrf-token')

    expect(apiRequestMock).toHaveBeenCalledWith('/invitations/accept', {
      method: 'POST',
      body: { token: 'RAW_TOKEN' },
      headers: { 'X-CSRF-Token': 'csrf-token' },
    })
  })
})
