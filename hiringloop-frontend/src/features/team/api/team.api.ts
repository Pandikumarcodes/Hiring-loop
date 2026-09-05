import { ApiError } from '../../../shared/lib/apiErrors'
import { apiRequest } from '../../../shared/lib/apiClient'
import type {
  AcceptanceDto,
  InvitationDto,
  MemberDto,
  TeamListEnvelope,
  TeamRole,
} from '../types/team.types'

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
function invalid(): never {
  throw new ApiError({
    kind: 'response',
    code: 'INVALID_API_RESPONSE',
    message: 'The server returned an invalid response.',
  })
}
function data<T>(response: unknown, key: string): readonly T[] {
  return record(response) &&
    record(response.data) &&
    Array.isArray(response.data[key])
    ? (response.data[key] as readonly T[])
    : invalid()
}

export async function listMembers(
  organizationId: string,
  signal?: AbortSignal,
) {
  return data<MemberDto>(
    await apiRequest<TeamListEnvelope<{ members: readonly MemberDto[] }>>(
      `/organizations/${encodeURIComponent(organizationId)}/members`,
      { signal },
    ),
    'members',
  )
}
export async function listInvitations(
  organizationId: string,
  signal?: AbortSignal,
) {
  return data<InvitationDto>(
    await apiRequest<
      TeamListEnvelope<{ invitations: readonly InvitationDto[] }>
    >(`/organizations/${encodeURIComponent(organizationId)}/invitations`, {
      signal,
    }),
    'invitations',
  )
}
export async function createInvitation(
  organizationId: string,
  input: { email: string; role: TeamRole },
  csrfToken: string,
) {
  const response = await apiRequest<
    TeamListEnvelope<{ invitation: InvitationDto }>
  >(`/organizations/${encodeURIComponent(organizationId)}/invitations`, {
    method: 'POST',
    body: input,
    headers: { 'X-CSRF-Token': csrfToken },
  })
  if (
    !record(response) ||
    !record(response.data) ||
    !record(response.data.invitation)
  )
    return invalid()
  return response.data.invitation as InvitationDto
}
export async function updateMemberRole(
  organizationId: string,
  membershipId: string,
  role: TeamRole,
  csrfToken: string,
) {
  const response = await apiRequest<TeamListEnvelope<{ member: MemberDto }>>(
    `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(membershipId)}/role`,
    { method: 'PATCH', body: { role }, headers: { 'X-CSRF-Token': csrfToken } },
  )
  if (
    !record(response) ||
    !record(response.data) ||
    !record(response.data.member)
  )
    return invalid()
  return response.data.member as MemberDto
}
export async function removeMember(
  organizationId: string,
  membershipId: string,
  csrfToken: string,
) {
  return apiRequest(
    `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(membershipId)}`,
    { method: 'DELETE', headers: { 'X-CSRF-Token': csrfToken } },
  )
}
export async function revokeInvitation(
  organizationId: string,
  invitationId: string,
  csrfToken: string,
) {
  return apiRequest(
    `/organizations/${encodeURIComponent(organizationId)}/invitations/${encodeURIComponent(invitationId)}`,
    { method: 'DELETE', headers: { 'X-CSRF-Token': csrfToken } },
  )
}
export async function acceptInvitation(token: string, csrfToken: string) {
  const response = await apiRequest<TeamListEnvelope<AcceptanceDto>>(
    // apiRequest adds the single /api/v1 prefix. Keep this feature endpoint
    // aligned with the backend's unscoped acceptance route.
    '/invitations/accept',
    { method: 'POST', body: { token }, headers: { 'X-CSRF-Token': csrfToken } },
  )
  if (
    !record(response) ||
    !record(response.data) ||
    !record(response.data.organization) ||
    !record(response.data.membership)
  )
    return invalid()
  return response.data as AcceptanceDto
}
