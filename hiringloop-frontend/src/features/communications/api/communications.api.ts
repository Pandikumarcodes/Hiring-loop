import { apiRequest } from '../../../shared/lib/apiClient'
import { ApiError } from '../../../shared/lib/apiErrors'
import type {
  CommunicationPageDto,
  CommunicationTemplateDto,
  SendCommunicationResult,
  TemplateInput,
  TemplatePageDto,
} from '../types/communications.types'

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const base = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}`
function invalid(): never {
  throw new ApiError({
    kind: 'response',
    code: 'INVALID_API_RESPONSE',
    message: 'The server returned an invalid communication response.',
  })
}
function pageResponse<T>(response: unknown): {
  data: T
  pagination: { page: number; pageSize: number }
} {
  if (
    !record(response) ||
    !('data' in response) ||
    !record(response.pagination)
  )
    return invalid()
  return {
    data: response.data as T,
    pagination: response.pagination as { page: number; pageSize: number },
  }
}

export async function listCommunications(
  organizationId: string,
  applicationId: string,
  page: number,
  signal?: AbortSignal,
) {
  const response = await apiRequest(
    `${base(organizationId)}/applications/${encodeURIComponent(applicationId)}/communications?page=${page}&pageSize=10`,
    { signal },
  )
  return pageResponse<CommunicationPageDto['data']>(response)
}
export async function sendCommunication(
  organizationId: string,
  applicationId: string,
  input: { subject: string; body: string; idempotencyKey: string },
  csrfToken: string,
) {
  const response = await apiRequest<{ data: SendCommunicationResult }>(
    `${base(organizationId)}/applications/${encodeURIComponent(applicationId)}/communications`,
    { method: 'POST', headers: { 'X-CSRF-Token': csrfToken }, body: input },
  )
  if (
    !record(response) ||
    !record(response.data) ||
    !record(response.data.communication)
  )
    return invalid()
  return response.data
}
export async function listTemplates(
  organizationId: string,
  signal?: AbortSignal,
) {
  const response = await apiRequest(
    `${base(organizationId)}/communication-templates?page=1&pageSize=100`,
    { signal },
  )
  return pageResponse<TemplatePageDto['data']>(response)
}
export async function createTemplate(
  organizationId: string,
  input: TemplateInput,
  csrfToken: string,
) {
  const response = await apiRequest<{ data: CommunicationTemplateDto }>(
    `${base(organizationId)}/communication-templates`,
    {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
      body: input as unknown as Record<
        string,
        import('../../../shared/types').JsonValue
      >,
    },
  )
  if (!record(response) || !record(response.data)) return invalid()
  return response.data
}
export async function updateTemplate(
  organizationId: string,
  templateId: string,
  input: TemplateInput,
  csrfToken: string,
) {
  const response = await apiRequest<{ data: CommunicationTemplateDto }>(
    `${base(organizationId)}/communication-templates/${encodeURIComponent(templateId)}`,
    {
      method: 'PATCH',
      headers: { 'X-CSRF-Token': csrfToken },
      body: input as unknown as Record<
        string,
        import('../../../shared/types').JsonValue
      >,
    },
  )
  if (!record(response) || !record(response.data)) return invalid()
  return response.data
}
export async function deleteTemplate(
  organizationId: string,
  templateId: string,
  csrfToken: string,
) {
  await apiRequest(
    `${base(organizationId)}/communication-templates/${encodeURIComponent(templateId)}`,
    { method: 'DELETE', headers: { 'X-CSRF-Token': csrfToken } },
  )
}
