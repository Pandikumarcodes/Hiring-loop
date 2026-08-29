export interface FrontendConfig {
  apiBaseUrl: string | undefined
}

function readApiBaseUrl(): string | undefined {
  const value = import.meta.env.VITE_API_BASE_URL?.trim()

  if (!value) {
    return undefined
  }

  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new Error(
      'VITE_API_BASE_URL must be a valid absolute URL when provided.',
    )
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('VITE_API_BASE_URL must use HTTP or HTTPS when provided.')
  }

  return value
}

// Values exposed by Vite are public and must never contain backend secrets.
export const frontendConfig: FrontendConfig = {
  apiBaseUrl: readApiBaseUrl(),
}
