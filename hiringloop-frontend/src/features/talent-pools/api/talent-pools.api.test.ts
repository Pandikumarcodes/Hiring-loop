import { beforeEach, expect, it, vi } from 'vitest'

import { apiRequest } from '../../../shared/lib/apiClient'
import { addMember } from './talent-pools.api'

vi.mock('../../../shared/lib/apiClient', () => ({ apiRequest: vi.fn() }))

beforeEach(() => vi.mocked(apiRequest).mockResolvedValue({ data: {} }))

it('sends only the strict membership API fields', async () => {
  await addMember(
    'organization',
    'pool',
    { candidateId: 'candidate', sourceApplicationId: 'application' },
    'csrf',
  )

  expect(apiRequest).toHaveBeenCalledWith(
    '/organizations/organization/talent-pools/pool/members',
    {
      method: 'POST',
      headers: { 'X-CSRF-Token': 'csrf' },
      body: { candidateId: 'candidate', sourceApplicationId: 'application' },
    },
  )
})
