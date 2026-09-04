import type { Location, To } from 'react-router-dom'

/** Only application-owned destinations may be restored after sign-in. */
export function getSafeReturnTo(value: unknown): To {
  const candidate = isLocation(value) ? value : null

  if (!candidate || !isSafeInternalRoute(candidate.pathname)) {
    return '/app'
  }

  return {
    pathname: candidate.pathname,
    search: candidate.search,
    hash: candidate.hash,
  }
}

function isLocation(value: unknown): value is Location {
  if (!value || typeof value !== 'object') return false
  const location = value as Partial<Location>
  return (
    typeof location.pathname === 'string' &&
    typeof location.search === 'string' &&
    typeof location.hash === 'string'
  )
}

function isSafeInternalRoute(pathname: string) {
  return (
    pathname === '/app' ||
    pathname.startsWith('/app/') ||
    pathname === '/invitations/accept'
  )
}
