import { ApiError } from '../../../shared/lib/apiErrors'
import { apiRequest } from '../../../shared/lib/apiClient'
import type {
  CreateOrganizationInput,
  OrganizationDto,
  OrganizationDtoEnvelope,
  OrganizationListDto,
} from '../types/organization.types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function invalidResponse(): never {
  throw new ApiError({
    kind: 'response',
    code: 'INVALID_API_RESPONSE',
    message: 'The server returned an invalid response.',
  })
}

function requireOrganization(value: unknown): OrganizationDto {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    (value.permissions !== undefined &&
      (!Array.isArray(value.permissions) ||
        !value.permissions.every(
          (permission) => typeof permission === 'string',
        )))
  ) {
    return invalidResponse()
  }
  return value as unknown as OrganizationDto
}

export async function listOrganizations(
  signal?: AbortSignal,
): Promise<readonly OrganizationDto[]> {
  const response = await apiRequest<
    OrganizationDtoEnvelope<OrganizationListDto>
  >('/organizations', { signal })
  if (
    !isRecord(response) ||
    !isRecord(response.data) ||
    !Array.isArray(response.data.organizations)
  ) {
    return invalidResponse()
  }
  return response.data.organizations.map(requireOrganization)
}

export async function getOrganization(
  organizationId: string,
  signal?: AbortSignal,
): Promise<OrganizationDto> {
  const response = await apiRequest<
    OrganizationDtoEnvelope<{ organization: OrganizationDto }>
  >(`/organizations/${encodeURIComponent(organizationId)}`, { signal })
  if (!isRecord(response) || !isRecord(response.data)) return invalidResponse()
  return requireOrganization(response.data.organization)
}

export async function createOrganization(
  input: CreateOrganizationInput,
  csrfToken: string,
): Promise<OrganizationDto> {
  const response = await apiRequest<
    OrganizationDtoEnvelope<{ organization: OrganizationDto }>
  >('/organizations', {
    method: 'POST',
    body: {
      name: input.name,
      ...(input.website ? { website: input.website } : {}),
      ...(input.description ? { description: input.description } : {}),
    },
    headers: { 'X-CSRF-Token': csrfToken },
  })
  if (!isRecord(response) || !isRecord(response.data)) return invalidResponse()
  return requireOrganization(response.data.organization)
}
