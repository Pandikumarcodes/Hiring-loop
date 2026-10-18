import { afterEach, describe, expect, test, vi } from 'vitest'

const apiRequestMock = vi.hoisted(() => vi.fn())
vi.mock('../../../shared/lib/apiClient', () => ({ apiRequest: apiRequestMock }))

import { updateTemplate } from './communications.api'

describe('communication template API client', () => {
  afterEach(() => vi.clearAllMocks())

  test('sends only the strict update body while keeping the template ID in the path', async () => {
    const input = {
      name: 'Offer',
      subject: 'Your offer',
      body: 'Congratulations',
      expectedRevision: 2,
    }
    apiRequestMock.mockResolvedValue({ data: { id: 'template-1' } })

    await updateTemplate(
      'org-1',
      'template-1',
      { ...input, id: 'template-1' } as typeof input,
      'csrf-token',
    )

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/organizations/org-1/communication-templates/template-1',
      {
        method: 'PATCH',
        headers: { 'X-CSRF-Token': 'csrf-token' },
        body: input,
      },
    )
  })
})
