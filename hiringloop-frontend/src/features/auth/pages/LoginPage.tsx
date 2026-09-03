import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { isApiError } from '../../../api/errors'
import { Button, Field, Input } from '../../../components/ui'
import { useLogin } from '../mutations'
import { getSafeReturnTo } from '../../../app/router/safe-route'
import { readAuthOAuthStatus } from '../url-state'
import {
  genericMutationError,
  rateLimitMessage,
  validateEmail,
} from '../ui-utils'
import {
  AuthAlert,
  AuthLayout,
  AuthPageHeader,
  GoogleButton,
  PasswordField,
} from '../components'

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
      <form className="auth-form" onSubmit={submit} noValidate>
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
        <div className="auth-form__password-group">
          <Link className="auth-form__inline-link" to="/forgot-password">
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
        <Button
          className="auth-form__submit"
          loading={login.isPending}
          type="submit"
        >
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <div className="auth-divider">
        <span>or</span>
      </div>
      <GoogleButton disabled={login.isPending} />
      <p className="auth-footer-copy">
        New to HiringLoop? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  )
}
