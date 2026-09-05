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
        <div className="grid min-w-0 justify-items-start gap-6">
          <span
            className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-xl font-extrabold text-success"
            aria-hidden="true"
          >
            ✓
          </span>
          <AuthPageHeader
            title="Check your email"
            description="If an account is eligible, password reset instructions have been sent."
          />
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark"
            to="/login"
          >
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
      <form
        className="grid min-w-0 gap-[1.125rem]"
        onSubmit={submit}
        noValidate
      >
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
        <Button className="w-full" loading={forgot.isPending} type="submit">
          {forgot.isPending
            ? 'Sending instructions…'
            : 'Send reset instructions'}
        </Button>
      </form>
      <p className="mt-6 text-center text-[0.9375rem] leading-6 text-text-secondary [overflow-wrap:anywhere]">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthLayout>
  )
}
