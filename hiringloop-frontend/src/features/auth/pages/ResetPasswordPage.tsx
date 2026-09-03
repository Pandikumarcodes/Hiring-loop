import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { Button } from '../../../components/ui'
import { useResetPassword } from '../mutations'
import {
  isInvalidAuthToken,
  isTemporaryError,
  rateLimitMessage,
  TEMPORARY_ERROR_MESSAGE,
  validatePassword,
} from '../ui-utils'
import {
  AuthAlert,
  AuthLayout,
  AuthPageHeader,
  PasswordField,
} from '../components'

export function ResetPasswordPage() {
  const location = useLocation()
  const token = new URLSearchParams(location.search).get('token')
  const reset = useResetPassword()
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || reset.isPending) return
    const nextErrors: Record<string, string> = {}
    const passwordError = validatePassword(newPassword)
    if (passwordError) nextErrors.newPassword = passwordError
    if (!confirmation) nextErrors.confirmation = 'Confirm your new password.'
    else if (confirmation !== newPassword)
      nextErrors.confirmation = 'Passwords do not match.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    reset.reset()
    try {
      await reset.mutateAsync({ token, newPassword })
    } catch {
      // The safe mutation error is rendered below.
    }
  }

  if (!token) {
    return (
      <AuthLayout>
        <div className="auth-result">
          <AuthPageHeader
            title="Invalid reset link"
            description="This password reset link is missing required information."
          />
          <Link className="ui-button ui-button--primary" to="/forgot-password">
            Request a new reset link
          </Link>
        </div>
      </AuthLayout>
    )
  }

  if (reset.isSuccess) {
    return (
      <AuthLayout>
        <div className="auth-result">
          <span className="auth-result__icon" aria-hidden="true">
            ✓
          </span>
          <AuthPageHeader
            title="Password updated"
            description="Your password has been changed successfully. Please sign in again."
          />
          <Link className="ui-button ui-button--primary" to="/login">
            Sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  if (reset.isError && isInvalidAuthToken(reset.error)) {
    return (
      <AuthLayout>
        <div className="auth-result">
          <AuthPageHeader
            title="Reset link unavailable"
            description="The password reset link is invalid or has expired."
          />
          <Link className="ui-button ui-button--primary" to="/forgot-password">
            Request a new reset link
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AuthPageHeader
        title="Choose a new password"
        description="Use a strong password you haven't used before."
      />
      {reset.isError ? (
        <AuthAlert>
          {rateLimitMessage(reset.error) ??
            (isTemporaryError(reset.error)
              ? TEMPORARY_ERROR_MESSAGE
              : 'We could not update your password right now. Please try again.')}
        </AuthAlert>
      ) : null}
      <form className="auth-form" onSubmit={submit} noValidate>
        <PasswordField
          autoComplete="new-password"
          disabled={reset.isPending}
          error={errors.newPassword}
          helperText="Use 12–128 characters."
          id="new-password"
          label="New password"
          onChange={setNewPassword}
          value={newPassword}
        />
        <PasswordField
          autoComplete="new-password"
          disabled={reset.isPending}
          error={errors.confirmation}
          id="confirm-password"
          label="Confirm password"
          onChange={setConfirmation}
          value={confirmation}
        />
        <Button
          className="auth-form__submit"
          loading={reset.isPending}
          type="submit"
        >
          {reset.isPending ? 'Updating password…' : 'Update password'}
        </Button>
      </form>
      <p className="auth-footer-copy">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthLayout>
  )
}
