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
  | 'offer:view'
  | 'offer:create'
  | 'offer:update'
  | 'offer:revise'
  | 'offer:send'
  | 'offer:record-acceptance'
  | 'offer:record-decline'
  | 'offer:withdraw'
  | 'application:hire'
  | 'application:reject'
  | 'application:reopen'
  | 'talent-pool:view'
  | 'talent-pool:manage'
  | 'talent-pool-member:manage'
  | 'scorecard:complete'
  | 'application-note:manage'
  | 'communication:view'
  | 'communication:send'
  | 'communication-template:view'
  | 'communication-template:manage'
  | 'notification:view-own'
  | 'notification:read-own'
  | 'notification-preference:manage-own'

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
