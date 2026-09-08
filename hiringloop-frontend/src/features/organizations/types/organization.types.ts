export interface OrganizationDto {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly website: string | null
  readonly description: string | null
  readonly createdAt: string
  readonly updatedAt: string
  readonly permissions?: readonly OrganizationPermission[]
}

export type OrganizationPermission =
  | 'member:read'
  | 'member:invite'
  | 'member:role-change'
  | 'member:remove'
  | 'invitation:read'
  | 'invitation:revoke'
  | 'job:list'
  | 'job:read'
  | 'job:create'
  | 'job:update'
  | 'job:open'
  | 'job:close'
  | 'job:reopen'
  | 'job:archive'
  | 'pipeline:view'
  | 'pipeline:configure'
  | 'application-form:view'
  | 'application-form:configure'
  | 'candidate:list'
  | 'candidate:read'
  | 'candidate-document:access'
  | 'interview:create'
  | 'interview:view'
  | 'interview:view-assigned'
  | 'interview:update'
  | 'interview:reschedule'
  | 'interview:cancel'
  | 'scorecard-template:view'
  | 'scorecard-template:manage'
  | 'scorecard:view-submitted'
  | 'scorecard:complete'
  | 'application-note:manage'

export interface CreateOrganizationInput {
  readonly name: string
  readonly website?: string
  readonly description?: string
}

export interface OrganizationListDto {
  readonly organizations: readonly OrganizationDto[]
}

export interface OrganizationDtoEnvelope<TData> {
  readonly data: TData
}
