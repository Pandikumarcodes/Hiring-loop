import type { AuthOAuthStatus } from './types'

const AUTH_OAUTH_STATUSES: ReadonlySet<string> = new Set([
  'account-linking-required',
  'authentication-failed',
])

/** Reads only backend-approved OAuth result values from router search state. */
export function readAuthOAuthStatus(
  search: string | URLSearchParams,
): AuthOAuthStatus | null {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search
  const status = params.get('oauth')

  return status && AUTH_OAUTH_STATUSES.has(status)
    ? (status as AuthOAuthStatus)
    : null
}
