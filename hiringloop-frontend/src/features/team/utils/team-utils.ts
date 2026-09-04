import type { ApiError } from '../../../shared/lib/apiErrors'
import type { TeamRole } from '../types/team.types'

export const ROLE_LABELS: Record<TeamRole, string> = {
  ADMIN: 'Admin',
  RECRUITER: 'Recruiter',
  HIRING_MANAGER: 'Hiring Manager',
  INTERVIEWER: 'Interviewer',
}

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  ADMIN: 'Manage workspace access and team settings.',
  RECRUITER: 'Manage recruiting workflows and candidates.',
  HIRING_MANAGER: 'Review hiring work for assigned teams.',
  INTERVIEWER: 'Participate in interviews and feedback.',
}

export function roleLabel(role: TeamRole) {
  return ROLE_LABELS[role] ?? role
}

export function canManageTeam(role: TeamRole | undefined) {
  return role === 'ADMIN'
}

export function teamErrorMessage(error: unknown, fallback: string) {
  const apiError = error as Partial<ApiError>
  if (apiError.status === 403)
    return 'You do not have permission to manage this workspace team.'
  if (apiError.status === 404)
    return 'This team member or invitation is no longer available.'
  if (apiError.status === 409) {
    return 'This workspace must always have at least one Admin, or its membership history prevents this change.'
  }
  if (apiError.code === 'EMAIL_DELIVERY_FAILED') {
    return 'The invitation was saved, but the email could not be delivered. Try sending the invitation again.'
  }
  return fallback
}

export function invitationState(invitation: {
  acceptedAt: string | null
  revokedAt: string | null
  expiresAt: string
}) {
  if (invitation.acceptedAt) return 'Accepted'
  if (invitation.revokedAt) return 'Revoked'
  if (new Date(invitation.expiresAt).getTime() <= Date.now()) return 'Expired'
  return 'Pending'
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(value),
  )
}
