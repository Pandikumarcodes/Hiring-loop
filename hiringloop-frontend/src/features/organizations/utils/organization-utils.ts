export const ORGANIZATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isOrganizationId(value: string | undefined): value is string {
  return Boolean(value && ORGANIZATION_ID_PATTERN.test(value))
}

export function organizationMutationError(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'ORGANIZATION_NAME_TAKEN'
  ) {
    return 'That organization name is already in use. Try another name.'
  }
  return "We couldn't create the organization right now. Please try again."
}
