import { afterEach, describe, expect, test, vi } from 'vitest'

const apiRequestMock = vi.hoisted(() => vi.fn())
vi.mock('../../../shared/lib/apiClient', () => ({ apiRequest: apiRequestMock }))

import {
  accessCandidateDocument,
  listCandidates,
} from './candidate-management.api'

afterEach(() => vi.clearAllMocks())

describe('candidate management API client', () => {
  test('uses backend candidate list query names and defaults', async () => {
    apiRequestMock.mockResolvedValue({
      data: { candidates: [] },
      pagination: { page: 1, limit: 25, totalItems: 0, totalPages: 0 },
    })
    await listCandidates('org-1', {
      page: 1,
      pageSize: 25,
      sort: 'newestApplication',
      search: 'Alice',
      jobId: 'job-1',
      stageId: 'stage-1',
    })
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/organizations/org-1/candidates?page=1&pageSize=25&sort=newestApplication&search=Alice&jobId=job-1&stageId=stage-1',
      { signal: undefined },
    )
  })

  test('posts document access with the CSRF header and returns signed URL data', async () => {
    const access = {
      url: 'https://signed.example.test/file',
      expiresAt: '2026-09-01T10:05:00.000Z',
      fileName: 'resume.pdf',
      contentType: 'application/pdf',
    }
    apiRequestMock.mockResolvedValue({ data: access })
    await expect(
      accessCandidateDocument('org-1', 'document-1', 'csrf-token'),
    ).resolves.toEqual(access)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/organizations/org-1/candidate-documents/document-1/access',
      { method: 'POST', headers: { 'X-CSRF-Token': 'csrf-token' } },
    )
  })
})
