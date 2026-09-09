import { apiRequest } from '../../../shared/lib/apiClient'
import { ApiError } from '../../../shared/lib/apiErrors'
import type {
  NotificationDto,
  NotificationPageDto,
  NotificationPreferenceDto,
} from '../types/notifications.types'
const base = (id: string) => `/organizations/${encodeURIComponent(id)}`
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null
function invalid(): never {
  throw new ApiError({
    kind: 'response',
    code: 'INVALID_API_RESPONSE',
    message: 'The server returned an invalid notification response.',
  })
}
export async function listNotifications(
  org: string,
  page: number,
  signal?: AbortSignal,
) {
  const r = await apiRequest(
    `${base(org)}/notifications?page=${page}&pageSize=20`,
    { signal },
  )
  if (!record(r) || !Array.isArray(r.data) || !record(r.pagination))
    return invalid()
  return {
    data: r.data as NotificationPageDto['data'],
    pagination: r.pagination as NotificationPageDto['pagination'],
  }
}
export async function unreadCount(org: string, signal?: AbortSignal) {
  const r = await apiRequest<{ count: number }>(
    `${base(org)}/notifications/unread-count`,
    { signal },
  )
  if (!record(r) || typeof r.count !== 'number') return invalid()
  return r.count
}
export async function markNotificationRead(
  org: string,
  id: string,
  csrf: string,
) {
  const r = await apiRequest<{ data: NotificationDto }>(
    `${base(org)}/notifications/${encodeURIComponent(id)}/read`,
    { method: 'PATCH', headers: { 'X-CSRF-Token': csrf } },
  )
  if (!record(r) || !record(r.data)) return invalid()
  return r.data
}
export async function markAllNotificationsRead(org: string, csrf: string) {
  await apiRequest(`${base(org)}/notifications/read-all`, {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrf },
  })
}
export async function getPreferences(org: string, signal?: AbortSignal) {
  const r = await apiRequest<{ data: NotificationPreferenceDto[] }>(
    `${base(org)}/notification-preferences`,
    { signal },
  )
  if (!record(r) || !Array.isArray(r.data)) return invalid()
  return r.data
}
export async function putPreferences(
  org: string,
  preferences: NotificationPreferenceDto[],
  csrf: string,
) {
  await apiRequest(`${base(org)}/notification-preferences`, {
    method: 'PUT',
    headers: { 'X-CSRF-Token': csrf },
    body: { preferences } as unknown as Record<
      string,
      import('../../../shared/types').JsonValue
    >,
  })
}
