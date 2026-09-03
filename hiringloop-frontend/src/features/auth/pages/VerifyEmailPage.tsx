import { Link, useLocation } from 'react-router-dom'

import { Button } from '../../../shared/components/ui'
import { useVerifyEmail } from '../hooks/mutations'
import {
  deliveryFailureMessage,
  isInvalidAuthToken,
  isTemporaryError,
  rateLimitMessage,
  TEMPORARY_ERROR_MESSAGE,
} from '../utils/ui-utils'
import {
  AuthAlert,
  AuthPageHeader,
  ResendVerificationForm,
} from '../components'
import { AuthLayout } from '../../../layouts/AuthLayout'

export function VerifyEmailPage() {
  const location = useLocation()
  const token = new URLSearchParams(location.search).get('token')
  const verify = useVerifyEmail()

  async function verifyToken() {
    if (!token || verify.isPending) return
    verify.reset()
    try {
      await verify.mutateAsync({ token })
    } catch {
      // The safe mutation error is rendered below.
    }
  }

  if (!token) {
    return (
      <AuthLayout>
        <div className="auth-result">
          <AuthPageHeader
            title="Invalid verification link"
            description="This verification link is missing required information."
          />
          <Link to="/login">Back to sign in</Link>
          <ResendVerificationForm />
        </div>
      </AuthLayout>
    )
  }

  if (verify.isSuccess) {
    return (
      <AuthLayout>
        <div className="auth-result">
          <span className="auth-result__icon" aria-hidden="true">
            ✓
          </span>
          <AuthPageHeader
            title="Email verified"
            description="Your email has been successfully verified."
          />
          <Link className="ui-button ui-button--primary" to="/login">
            Sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  if (verify.isError && isInvalidAuthToken(verify.error)) {
    return (
      <AuthLayout>
        <div className="auth-result">
          <AuthPageHeader
            title="Verification link unavailable"
            description="This verification link is invalid or has expired."
          />
          <ResendVerificationForm />
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AuthPageHeader
        title={verify.isPending ? 'Verifying your email…' : 'Verify your email'}
        description="Confirm your email address to finish setting up your account."
      />
      {verify.isError ? (
        <AuthAlert>
          {rateLimitMessage(verify.error) ??
            deliveryFailureMessage(verify.error) ??
            (isTemporaryError(verify.error)
              ? TEMPORARY_ERROR_MESSAGE
              : 'We could not verify this email right now. Please try again.')}
        </AuthAlert>
      ) : null}
      <Button
        className="auth-form__submit"
        loading={verify.isPending}
        onClick={verifyToken}
        type="button"
      >
        {verify.isPending ? 'Verifying…' : 'Verify email'}
      </Button>
      <p className="auth-footer-copy">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthLayout>
  )
}
