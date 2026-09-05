import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { isApiError } from '../../../shared/lib/apiErrors'
import { Button, Field, Input } from '../../../shared/components/ui'
import { useLogin } from '../hooks/mutations'
import { getSafeReturnTo } from '../../../app/router/safe-route'
import { readAuthOAuthStatus } from '../utils/url-state'
import {
  genericMutationError,
  rateLimitMessage,
  validateEmail,
} from '../utils/ui-utils'
import {
  AuthAlert,
  AuthPageHeader,
  GoogleButton,
  PasswordField,
} from '../components'
import { AuthLayout } from '../../../layouts/AuthLayout'

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [oauthStatus] = useState(() => readAuthOAuthStatus(location.search))

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (!params.has('oauth')) return

    // Keep the safe result in local state, then remove the consumed provider
    // status from the browser URL and history entry.
    navigate(
      { pathname: location.pathname, hash: location.hash },
      { replace: true },
    )
  }, [location.hash, location.pathname, location.search, navigate])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (login.isPending) return

    const nextErrors: Record<string, string> = {}
    const emailError = validateEmail(email)
    if (emailError) nextErrors.email = emailError
    if (!password) nextErrors.password = 'Enter your password.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    login.reset()
    try {
      await login.mutateAsync({ email: email.trim(), password })
      navigate(getSafeReturnTo(location.state && location.state.from), {
        replace: true,
      })
    } catch {
      // The safe mutation error is rendered below.
    }
  }

  const loginError = login.isError
    ? isApiError(login.error) && login.error.code === 'AUTHENTICATION_FAILED'
      ? 'The email or password you entered is incorrect.'
      : (rateLimitMessage(login.error) ?? genericMutationError(login.error))
    : null

  return (
    <AuthLayout>
      <AuthPageHeader
        title="Welcome back"
        description="Sign in to continue to HiringLoop."
      />
      {oauthStatus === 'account-linking-required' ? (
        <AuthAlert tone="warning">
          An account with this email already exists. Sign in with your existing
          method before linking Google.
        </AuthAlert>
      ) : null}
      {oauthStatus === 'authentication-failed' ? (
        <AuthAlert>
          We couldn't complete Google sign-in. Please try again.
        </AuthAlert>
      ) : null}
      {loginError ? <AuthAlert>{loginError}</AuthAlert> : null}
      <form
        className="grid min-w-0 gap-[1.125rem]"
        onSubmit={submit}
        noValidate
      >
        <Field error={errors.email} id="login-email" label="Email" required>
          {({ describedBy, invalid }) => (
            <Input
              aria-describedby={describedBy}
              aria-invalid={invalid}
              autoComplete="email"
              disabled={login.isPending}
              id="login-email"
              name="email"
              onChange={(event) => {
                setEmail(event.target.value)
                if (errors.email)
                  setErrors((current) => ({ ...current, email: '' }))
              }}
              required
              type="email"
              value={email}
            />
          )}
        </Field>
        <div className="relative min-w-0">
          <Link
            className="absolute right-0 top-0 z-10 max-w-full text-sm font-semibold text-primary-dark hover:underline"
            to="/forgot-password"
          >
            Forgot password?
          </Link>
          <PasswordField
            autoComplete="current-password"
            disabled={login.isPending}
            error={errors.password}
            id="login-password"
            label="Password"
            onChange={(value) => {
              setPassword(value)
              if (errors.password)
                setErrors((current) => ({ ...current, password: '' }))
            }}
            value={password}
          />
        </div>
        <Button className="w-full" loading={login.isPending} type="submit">
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <div className="my-7 flex items-center gap-3 text-sm text-text-secondary before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        <span>or</span>
      </div>
      <GoogleButton disabled={login.isPending} />
      <p className="mt-6 text-center text-[0.9375rem] leading-6 text-text-secondary [overflow-wrap:anywhere]">
        New to HiringLoop? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  )
}
