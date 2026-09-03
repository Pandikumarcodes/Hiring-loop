export interface OrganizationDto {
  readonly id: string
  readonly name: string
  readonly website: string | null
  readonly description: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

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
