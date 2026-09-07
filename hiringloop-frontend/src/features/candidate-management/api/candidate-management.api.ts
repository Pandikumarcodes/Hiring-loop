import { apiRequest } from '../../../shared/lib/apiClient'
import { ApiError } from '../../../shared/lib/apiErrors'
import type {
  ApplicationDetailDto,
  CandidateDetailDto,
  CandidateListFilters,
  CandidatePageDto,
  DocumentAccessDto,
} from '../types/candidate-management.types'

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function invalid(): never {
  throw new ApiError({
    kind: 'response',
    code: 'INVALID_API_RESPONSE',
    message: 'The server returned an invalid candidate response.',
  })
}

const base = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}`

function dataValue(response: unknown, key: string): unknown {
  return record(response) && record(response.data)
    ? response.data[key]
    : invalid()
}

export async function listCandidates(
  organizationId: string,
  filters: CandidateListFilters,
  signal?: AbortSignal,
): Promise<CandidatePageDto> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const response = await apiRequest(
    `${base(organizationId)}/candidates?${params}`,
    {
      signal,
    },
  )
  if (
    !record(response) ||
    !record(response.data) ||
    !Array.isArray(response.data.candidates) ||
    !record(response.pagination)
  )
    return invalid()
  return {
    candidates: response.data.candidates as CandidatePageDto['candidates'],
    pagination: response.pagination as CandidatePageDto['pagination'],
  }
}

export async function getCandidate(
  organizationId: string,
  candidateId: string,
  signal?: AbortSignal,
): Promise<CandidateDetailDto> {
  const response = await apiRequest(
    `${base(organizationId)}/candidates/${encodeURIComponent(candidateId)}`,
    { signal },
  )
  const value = dataValue(response, 'candidate')
  return record(value) ? (value as unknown as CandidateDetailDto) : invalid()
}

export async function getApplication(
  organizationId: string,
  applicationId: string,
  signal?: AbortSignal,
): Promise<ApplicationDetailDto> {
  const response = await apiRequest(
    `${base(organizationId)}/applications/${encodeURIComponent(applicationId)}`,
    { signal },
  )
  const value = dataValue(response, 'application')
  return record(value) ? (value as unknown as ApplicationDetailDto) : invalid()
}

export async function accessCandidateDocument(
  organizationId: string,
  documentId: string,
  csrfToken: string,
): Promise<DocumentAccessDto> {
  const response = await apiRequest(
    `${base(organizationId)}/candidate-documents/${encodeURIComponent(documentId)}/access`,
    {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
    },
  )
  if (!record(response) || !record(response.data)) return invalid()
  return response.data as unknown as DocumentAccessDto
}
