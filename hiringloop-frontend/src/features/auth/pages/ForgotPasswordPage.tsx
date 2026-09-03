import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { Button, Field, Input } from '../../../shared/components/ui'
import { useForgotPassword } from '../hooks/mutations'
import {
  genericMutationError,
  rateLimitMessage,
  validateEmail,
} from '../utils/ui-utils'
import { AuthAlert, AuthPageHeader } from '../components'
import { AuthLayout } from '../../../layouts/AuthLayout'

export function ForgotPasswordPage() {
  const forgot = useForgotPassword()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string>()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (forgot.isPending) return
    const error = validateEmail(email)
    setEmailError(error)
    if (error) return
    forgot.reset()
    try {
      await forgot.mutateAsync({ email: email.trim() })
    } catch {
      // The safe mutation error is rendered below.
    }
  }

  if (forgot.isSuccess) {
    return (
      <AuthLayout>
        <div className="auth-result">
          <span className="auth-result__icon" aria-hidden="true">
            ✓
          </span>
          <AuthPageHeader
            title="Check your email"
            description="If an account is eligible, password reset instructions have been sent."
          />
          <Link className="ui-button ui-button--primary" to="/login">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AuthPageHeader
        title="Forgot your password?"
        description="Enter your email and we'll send password reset instructions."
      />
      {forgot.isError ? (
        <AuthAlert>
          {rateLimitMessage(forgot.error) ?? genericMutationError(forgot.error)}
        </AuthAlert>
      ) : null}
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field error={emailError} id="forgot-email" label="Email" required>
          {({ describedBy, invalid }) => (
            <Input
              aria-describedby={describedBy}
              aria-invalid={invalid}
              autoComplete="email"
              disabled={forgot.isPending}
              id="forgot-email"
              name="email"
              onChange={(event) => {
                setEmail(event.target.value)
                if (emailError) setEmailError(undefined)
              }}
              required
              type="email"
              value={email}
            />
          )}
        </Field>
        <Button
          className="auth-form__submit"
          loading={forgot.isPending}
          type="submit"
        >
          {forgot.isPending
            ? 'Sending instructions…'
            : 'Send reset instructions'}
        </Button>
      </form>
      <p className="auth-footer-copy">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthLayout>
  )
}
