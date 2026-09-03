export interface FrontendConfig {
  apiBaseUrl: string | undefined
}

export function normalizeApiBaseUrl(
  value: string | undefined,
): string | undefined {
  const trimmedValue = value?.trim()

  if (!trimmedValue) {
    return undefined
  }

  let url: URL

  try {
    url = new URL(trimmedValue)
  } catch {
    throw new Error(
      'VITE_API_BASE_URL must be a valid absolute URL when provided.',
    )
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('VITE_API_BASE_URL must use HTTP or HTTPS when provided.')
  }

  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(
      'VITE_API_BASE_URL must be a backend origin without an API path, query, or hash.',
    )
  }

  return url.toString().replace(/\/$/, '')
}

// Values exposed by Vite are public and must never contain backend secrets.
export const frontendConfig: FrontendConfig = {
  apiBaseUrl: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
}

export function assertFrontendConfig(): void {
  if (import.meta.env.DEV && !frontendConfig.apiBaseUrl) {
    throw new Error(
      'VITE_API_BASE_URL is required in development. Copy .env.example to .env.local and restart Vite.',
    )
  }
}
