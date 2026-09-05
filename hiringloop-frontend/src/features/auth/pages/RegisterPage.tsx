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
        <div className="grid min-w-0 justify-items-start gap-6">
          <span
            className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-xl font-extrabold text-success"
            aria-hidden="true"
          >
            ✓
          </span>
          <AuthPageHeader
            title="Check your inbox"
            description="We've sent a verification link to your email address."
          />
          <p className="text-sm leading-6 text-text-secondary">
            For privacy, this confirmation is the same whether or not an account
            already exists.
          </p>
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark"
            to="/login"
          >
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
      <form
        className="grid min-w-0 gap-[1.125rem]"
        onSubmit={submit}
        noValidate
      >
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
        <Button className="w-full" loading={register.isPending} type="submit">
          {register.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      {deliveryFailed ? (
        <ResendVerificationForm initialEmail={email.trim()} />
      ) : null}
      <div className="my-7 flex items-center gap-3 text-sm text-text-secondary before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        <span>or</span>
      </div>
      <GoogleButton disabled={register.isPending} />
      <p className="mt-6 text-center text-[0.9375rem] leading-6 text-text-secondary [overflow-wrap:anywhere]">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
