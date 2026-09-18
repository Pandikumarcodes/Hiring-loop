import { apiRequest } from '../../../shared/lib/apiClient'
import { ApiError } from '../../../shared/lib/apiErrors'
import type {
  AuditEvent,
  AuditFilters,
  AuditListPage,
} from '../types/audit.types'

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function invalid(): never {
  throw new ApiError({
    kind: 'response',
    code: 'INVALID_API_RESPONSE',
    message: 'The server returned an invalid audit response.',
  })
}

const base = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/audit-events`

function params(filters: AuditFilters, page: number, pageSize: number) {
  const value = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  Object.entries(filters).forEach(([key, item]) => {
    if (item) value.set(key, item)
  })
  return value
}

function envelope(response: unknown): unknown {
  if (!record(response) || !('data' in response)) return invalid()
  return response.data
}

export async function listAuditEvents(
  organizationId: string,
  filters: AuditFilters,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
) {
  const data = envelope(
    await apiRequest<unknown>(
      `${base(organizationId)}?${params(filters, page, pageSize)}`,
      { signal },
    ),
  )
  if (
    !record(data) ||
    !Array.isArray(data.auditEvents) ||
    !record(data.pagination)
  )
    return invalid()
  return data as unknown as AuditListPage
}

export async function getAuditEvent(
  organizationId: string,
  auditEventId: string,
  signal?: AbortSignal,
) {
  const data = envelope(
    await apiRequest<unknown>(
      `${base(organizationId)}/${encodeURIComponent(auditEventId)}`,
      { signal },
    ),
  )
  return record(data) ? (data as unknown as AuditEvent) : invalid()
}
