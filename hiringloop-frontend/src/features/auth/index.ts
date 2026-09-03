export {
  changePassword,
  forgotPassword,
  getCsrfToken,
  getCurrentUser,
  getGoogleAuthStartUrl,
  login,
  logout,
  register,
  resendVerification,
  resetPassword,
  revokeAllSessions,
  verifyEmail,
} from './api/auth.api'
export { authKeys } from './hooks/query-keys'
export {
  csrfQueryOptions,
  currentUserQueryOptions,
  useCsrfToken,
  useCurrentUser,
} from './hooks/queries'
export {
  useChangePassword,
  useForgotPassword,
  useLogin,
  useLogout,
  useRegister,
  useResendVerification,
  useResetPassword,
  useRevokeAllSessions,
  useVerifyEmail,
} from './hooks/mutations'
export { readAuthOAuthStatus } from './utils/url-state'
export type {
  AcknowledgementDto,
  AuthOAuthStatus,
  AuthUserDto,
  ChangePasswordInput,
  EmailInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  ResetPasswordResultDto,
  VerifyEmailInput,
  VerifyEmailResultDto,
} from './types/auth.types'
