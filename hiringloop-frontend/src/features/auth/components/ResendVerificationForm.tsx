import { useState, type FormEvent } from 'react'

import { Button, Field, Input } from '../../../shared/components/ui'
import { useResendVerification } from '../hooks/mutations'
import {
  deliveryFailureMessage,
  genericMutationError,
  rateLimitMessage,
  validateEmail,
} from '../utils/ui-utils'
import { AuthAlert } from './AuthAlert'

interface ResendVerificationFormProps {
  initialEmail?: string
}

export function ResendVerificationForm({
  initialEmail = '',
}: ResendVerificationFormProps) {
  const [email, setEmail] = useState(initialEmail)
  const [emailError, setEmailError] = useState<string>()
  const resend = useResendVerification()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (resend.isPending) return

    const error = validateEmail(email)
    setEmailError(error)
    if (error) return

    resend.reset()
    try {
      await resend.mutateAsync({ email: email.trim() })
    } catch {
      // TanStack Query exposes the safe error state below.
    }
  }

  return (
    <div className="w-full rounded-card border border-border bg-background p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 text-base font-bold">
        Send a new verification email
      </h2>
      {resend.isSuccess ? (
        <AuthAlert tone="success">
          If the account is eligible, a verification email will be sent.
        </AuthAlert>
      ) : (
        <form className="grid min-w-0 gap-3" onSubmit={submit} noValidate>
          {resend.isError ? (
            <AuthAlert>
              {rateLimitMessage(resend.error) ??
                deliveryFailureMessage(resend.error) ??
                genericMutationError(resend.error)}
            </AuthAlert>
          ) : null}
          <Field error={emailError} id="resend-email" label="Email" required>
            {({ describedBy, invalid }) => (
              <Input
                aria-describedby={describedBy}
                aria-invalid={invalid}
                autoComplete="email"
                disabled={resend.isPending}
                id="resend-email"
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
          <Button loading={resend.isPending} type="submit" variant="secondary">
            {resend.isPending ? 'Sending…' : 'Resend verification email'}
          </Button>
        </form>
      )}
    </div>
  )
}
