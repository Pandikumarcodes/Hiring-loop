export interface AuthUserDto {
  readonly id: string
  readonly email: string
  readonly emailVerified: boolean
}

export interface AuthDataEnvelope<TData> {
  readonly data: TData
}

export interface SessionUserDto {
  readonly user: AuthUserDto
}

export interface CsrfTokenDto {
  readonly csrfToken: string
}

export interface AcknowledgementDto {
  readonly status: 'accepted'
  readonly message: string
}

export interface VerifyEmailResultDto {
  readonly status: 'verified'
  readonly message: string
}

export interface ResetPasswordResultDto {
  readonly status: 'password_reset'
}

export interface RegisterInput {
  readonly email: string
  readonly password: string
}

export interface LoginInput {
  readonly email: string
  readonly password: string
}

export interface EmailInput {
  readonly email: string
}

export interface VerifyEmailInput {
  readonly token: string
}

export interface ResetPasswordInput {
  readonly token: string
  readonly newPassword: string
}

export interface ChangePasswordInput {
  readonly currentPassword: string
  readonly newPassword: string
}

export type AuthOAuthStatus =
  | 'account-linking-required'
  | 'authentication-failed'
