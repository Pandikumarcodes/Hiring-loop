export const TEAM_ROLES = [
  'ADMIN',
  'RECRUITER',
  'HIRING_MANAGER',
  'INTERVIEWER',
] as const

export type TeamRole = (typeof TEAM_ROLES)[number]

export interface MemberDto {
  readonly id: string
  readonly role: TeamRole
  readonly joinedAt: string
  readonly user: { readonly id: string; readonly email: string }
}

export interface InvitationDto {
  readonly id: string
  readonly organizationId: string
  readonly email: string
  readonly role: TeamRole
  readonly expiresAt: string
  readonly acceptedAt: string | null
  readonly revokedAt: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export interface AcceptanceDto {
  readonly organization: { readonly id: string; readonly name: string }
  readonly membership: {
    readonly id: string
    readonly organizationId: string
    readonly role: TeamRole
  }
}

export interface TeamListEnvelope<T> {
  readonly data: T
}
