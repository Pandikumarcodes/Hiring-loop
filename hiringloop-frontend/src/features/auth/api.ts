import { ApiError } from '../../api/errors'
import { apiRequest, buildApiUrl } from '../../api/client'
import type {
  AcknowledgementDto,
  AuthDataEnvelope,
  ChangePasswordInput,
  CsrfTokenDto,
  EmailInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  ResetPasswordResultDto,
  SessionUserDto,
  VerifyEmailInput,
  VerifyEmailResultDto,
} from './types'

async function requestData<TData>(
  path: string,
  options?: Parameters<typeof apiRequest>[1],
): Promise<TData> {
  const response = await apiRequest<AuthDataEnvelope<TData>>(path, options)

  if (
    !response ||
    typeof response !== 'object' ||
    !('data' in response) ||
    response.data === null ||
    response.data === undefined
  ) {
    throw new ApiError({
      kind: 'response',
      code: 'INVALID_API_RESPONSE',
      message: 'The server returned an invalid response.',
    })
  }

  return response.data
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function requireAuthUser(value: unknown): SessionUserDto {
  if (
    !isRecord(value) ||
    !isRecord(value.user) ||
    typeof value.user.id !== 'string' ||
    typeof value.user.email !== 'string' ||
    typeof value.user.emailVerified !== 'boolean'
  ) {
    throw new ApiError({
      kind: 'response',
      code: 'INVALID_API_RESPONSE',
      message: 'The server returned an invalid response.',
    })
  }

  return value as unknown as SessionUserDto
}

function requireCsrfToken(value: unknown): CsrfTokenDto {
  if (
    !isRecord(value) ||
    typeof value.csrfToken !== 'string' ||
    !value.csrfToken
  ) {
    throw new ApiError({
      kind: 'response',
      code: 'INVALID_API_RESPONSE',
      message: 'The server returned an invalid response.',
    })
  }

  return value as unknown as CsrfTokenDto
}

export function register(input: RegisterInput): Promise<AcknowledgementDto> {
  return requestData('/auth/register', {
    method: 'POST',
    body: { email: input.email, password: input.password },
  })
}

export function login(input: LoginInput): Promise<SessionUserDto> {
  return requestData('/auth/login', {
    method: 'POST',
    body: { email: input.email, password: input.password },
  }).then(requireAuthUser)
}

export function getCurrentUser(signal?: AbortSignal): Promise<SessionUserDto> {
  return requestData('/auth/me', { signal }).then(requireAuthUser)
}

export function getCsrfToken(signal?: AbortSignal): Promise<CsrfTokenDto> {
  return requestData('/auth/csrf', { signal }).then(requireCsrfToken)
}

export async function logout(csrfToken: string): Promise<void> {
  await apiRequest<void>('/auth/logout', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  })
}

export async function revokeAllSessions(csrfToken: string): Promise<void> {
  await apiRequest<void>('/auth/sessions/revoke-all', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  })
}

export function resendVerification(
  input: EmailInput,
): Promise<AcknowledgementDto> {
  return requestData('/auth/verification/resend', {
    method: 'POST',
    body: { email: input.email },
  })
}

export function verifyEmail(
  input: VerifyEmailInput,
): Promise<VerifyEmailResultDto> {
  return requestData('/auth/verify-email', {
    method: 'POST',
    body: { token: input.token },
  })
}

export function forgotPassword(input: EmailInput): Promise<AcknowledgementDto> {
  return requestData('/auth/password/forgot', {
    method: 'POST',
    body: { email: input.email },
  })
}

export function resetPassword(
  input: ResetPasswordInput,
): Promise<ResetPasswordResultDto> {
  return requestData('/auth/password/reset', {
    method: 'POST',
    body: { token: input.token, newPassword: input.newPassword },
  })
}

export function changePassword(
  input: ChangePasswordInput,
  csrfToken: string,
): Promise<SessionUserDto> {
  return requestData('/auth/password/change', {
    method: 'POST',
    body: {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    },
    headers: { 'X-CSRF-Token': csrfToken },
  }).then(requireAuthUser)
}

/** This endpoint starts a top-level browser navigation, never an XHR flow. */
export function getGoogleAuthStartUrl(): string {
  return buildApiUrl('/auth/google/start')
}
