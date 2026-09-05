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
import { getSafeReturnTo } from '../../../app/router/safe-route'

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
        <div className="grid min-w-0 justify-items-start gap-6">
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
    const returnTo = getSafeReturnTo(location.state && location.state.from)
    return (
      <AuthLayout>
        <div className="grid min-w-0 justify-items-start gap-6">
          <span
            className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-xl font-extrabold text-success"
            aria-hidden="true"
          >
            ✓
          </span>
          <AuthPageHeader
            title="Email verified"
            description="Your email has been successfully verified."
          />
          {location.state && location.state.from ? (
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark"
              to={returnTo}
            >
              Continue
            </Link>
          ) : (
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark"
              to="/login"
            >
              Sign in
            </Link>
          )}
        </div>
      </AuthLayout>
    )
  }

  if (verify.isError && isInvalidAuthToken(verify.error)) {
    return (
      <AuthLayout>
        <div className="grid min-w-0 justify-items-start gap-6">
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
        className="w-full"
        loading={verify.isPending}
        onClick={verifyToken}
        type="button"
      >
        {verify.isPending ? 'Verifying…' : 'Verify email'}
      </Button>
      <p className="mt-6 text-center text-[0.9375rem] leading-6 text-text-secondary [overflow-wrap:anywhere]">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthLayout>
  )
}
