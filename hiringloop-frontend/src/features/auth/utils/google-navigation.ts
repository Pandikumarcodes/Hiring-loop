import { getGoogleAuthStartUrl } from '../api/auth.api'

/** Starts OAuth as a top-level backend navigation, never a client-side flow. */
export function startGoogleAuthentication(
  navigate: (url: string) => void = (url) => window.location.assign(url),
) {
  navigate(getGoogleAuthStartUrl())
}
