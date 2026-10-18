import { afterEach, describe, expect, test, vi } from 'vitest'

const apiRequestMock = vi.hoisted(() => vi.fn())
vi.mock('../../../shared/lib/apiClient', () => ({ apiRequest: apiRequestMock }))

import { editOffer, reviseOffer } from './offers.api'

const terms = {
  jobTitle: 'Staff Engineer',
  currency: 'USD',
  baseCompensationMinor: '250000',
  expectedRevision: 3,
}

describe('offer API client', () => {
  afterEach(() => vi.clearAllMocks())

  test('sends only the strict draft-edit body while keeping the offer ID in the path', async () => {
    apiRequestMock.mockResolvedValue({ data: { id: 'version-1' } })

    await editOffer(
      'org-1',
      'offer-1',
      { ...terms, id: 'offer-1' } as typeof terms,
      'csrf-token',
    )

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/organizations/org-1/offers/offer-1/draft',
      {
        method: 'PATCH',
        headers: { 'X-CSRF-Token': 'csrf-token' },
        body: terms,
      },
    )
  })

  test('sends only the strict revision body while keeping the offer ID in the path', async () => {
    apiRequestMock.mockResolvedValue({ data: { id: 'offer-1' } })

    await reviseOffer(
      'org-1',
      'offer-1',
      { ...terms, id: 'offer-1' } as typeof terms,
      'csrf-token',
    )

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/organizations/org-1/offers/offer-1/revisions',
      {
        method: 'POST',
        headers: { 'X-CSRF-Token': 'csrf-token' },
        body: terms,
      },
    )
  })
})
