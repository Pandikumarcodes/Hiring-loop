import { isApiError } from '../../api/errors'

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Enter your email address.'
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.'
  return undefined
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Enter your password.'
  if (password.length < 12) return 'Password must be at least 12 characters.'
  if (password.length > 128)
    return 'Password must be no more than 128 characters.'
  return undefined
}

function retryHint(retryAfter: string | undefined): string {
  const seconds = Number.parseInt(retryAfter ?? '', 10)
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  if (seconds < 60) return ` Try again in about ${seconds} seconds.`
  const minutes = Math.ceil(seconds / 60)
  return ` Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`
}

export function rateLimitMessage(error: unknown): string | null {
  if (!isApiError(error) || error.code !== 'RATE_LIMITED') return null
  return `Too many attempts. Please try again later.${retryHint(error.retryAfter)}`
}

export function isTemporaryError(error: unknown): boolean {
  return (
    !isApiError(error) ||
    error.kind === 'network' ||
    error.kind === 'response' ||
    (error.kind === 'http' && (error.status ?? 0) >= 500)
  )
}

export const TEMPORARY_ERROR_MESSAGE =
  "We couldn't complete that request right now. Please try again."

export function genericMutationError(error: unknown): string {
  return rateLimitMessage(error) ?? TEMPORARY_ERROR_MESSAGE
}

export function isInvalidAuthToken(error: unknown): boolean {
  return (
    isApiError(error) &&
    (error.code === 'AUTH_TOKEN_INVALID' ||
      error.code === 'VERIFICATION_TOKEN_INVALID' ||
      error.code === 'RESET_TOKEN_INVALID')
  )
}

export function deliveryFailureMessage(error: unknown): string | null {
  if (!isApiError(error) || error.code !== 'EMAIL_DELIVERY_FAILED') return null
  return 'Your request was accepted, but the email could not be delivered. Please try again.'
}
