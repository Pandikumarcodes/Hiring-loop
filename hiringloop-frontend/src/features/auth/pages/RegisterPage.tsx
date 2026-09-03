import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { isApiError } from '../../../shared/lib/apiErrors'
import { Button, Field, Input } from '../../../shared/components/ui'
import { useRegister } from '../hooks/mutations'
import {
  genericMutationError,
  rateLimitMessage,
  validateEmail,
  validatePassword,
} from '../utils/ui-utils'
import {
  AuthAlert,
  AuthPageHeader,
  GoogleButton,
  PasswordField,
  ResendVerificationForm,
} from '../components'
import { AuthLayout } from '../../../layouts/AuthLayout'

export function RegisterPage() {
  const register = useRegister()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (register.isPending) return
    const nextErrors: Record<string, string> = {}
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)
    if (emailError) nextErrors.email = emailError
    if (passwordError) nextErrors.password = passwordError
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    register.reset()
    try {
      await register.mutateAsync({ email: email.trim(), password })
    } catch {
      // The safe mutation error is rendered below.
    }
  }

  const deliveryFailed =
    register.isError &&
    isApiError(register.error) &&
    register.error.code === 'EMAIL_DELIVERY_FAILED'

  if (register.isSuccess) {
    return (
      <AuthLayout>
        <div className="auth-result">
          <span className="auth-result__icon" aria-hidden="true">
            ✓
          </span>
          <AuthPageHeader
            title="Check your inbox"
            description="We've sent a verification link to your email address."
          />
          <p className="auth-result__note">
            For privacy, this confirmation is the same whether or not an account
            already exists.
          </p>
          <Link className="ui-button ui-button--primary" to="/login">
            Go to sign in
          </Link>
          <ResendVerificationForm initialEmail={email.trim()} />
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AuthPageHeader
        title="Create your HiringLoop account"
        description="Start building a better hiring process."
      />
      {register.isError ? (
        <AuthAlert>
          {deliveryFailed
            ? "Your account was created, but we couldn't send the verification email. Try resending the verification email."
            : (rateLimitMessage(register.error) ??
              genericMutationError(register.error))}
        </AuthAlert>
      ) : null}
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field
          error={errors.email}
          id="register-email"
          label="Work email"
          required
        >
          {({ describedBy, invalid }) => (
            <Input
              aria-describedby={describedBy}
              aria-invalid={invalid}
              autoComplete="email"
              disabled={register.isPending}
              id="register-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          )}
        </Field>
        <PasswordField
          autoComplete="new-password"
          disabled={register.isPending}
          error={errors.password}
          helperText="Use at least 12 characters."
          id="register-password"
          label="Password"
          onChange={setPassword}
          value={password}
        />
        <Button
          className="auth-form__submit"
          loading={register.isPending}
          type="submit"
        >
          {register.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      {deliveryFailed ? (
        <ResendVerificationForm initialEmail={email.trim()} />
      ) : null}
      <div className="auth-divider">
        <span>or</span>
      </div>
      <GoogleButton disabled={register.isPending} />
      <p className="auth-footer-copy">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
