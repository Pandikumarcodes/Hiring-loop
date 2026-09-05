import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../../shared/components/feedback'
import { Button } from '../../../shared/components/ui'
import { useCurrentUser } from '../../auth/hooks/queries'
import { useAcceptInvitation } from '../hooks/mutations'
import { isApiError } from '../../../shared/lib/apiErrors'
export function InvitationAcceptancePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const token = new URLSearchParams(location.search).get('token')
  const accept = useAcceptInvitation()
  const attemptedToken = useRef<string | null>(null)
  const { isPending, isSuccess, mutateAsync, reset } = accept
  useEffect(() => {
    if (user.isUnauthenticated)
      navigate('/login', { state: { from: location }, replace: true })
    else if (
      user.isAuthenticated &&
      user.user?.emailVerified &&
      token &&
      attemptedToken.current !== token &&
      !isPending &&
      !isSuccess
    ) {
      attemptedToken.current = token
      void mutateAsync(token)
        .then((result) =>
          navigate(`/app/organizations/${result.organization.id}`, {
            replace: true,
          }),
        )
        .catch(() => {})
    }
  }, [
    isPending,
    isSuccess,
    location,
    mutateAsync,
    navigate,
    token,
    user.isAuthenticated,
    user.isUnauthenticated,
    user.user?.emailVerified,
  ])
  if (!token)
    return (
      <ErrorState
        title="Invitation unavailable"
        description="This invitation is invalid, expired, or no longer available."
      />
    )
  if (user.isPending) return <LoadingState label="Checking your session" />
  if (user.isUnauthenticated)
    return <LoadingState label="Redirecting to sign in" />
  if (!user.user?.emailVerified)
    return (
      <ErrorState
        title="Verify your email first"
        description="Verify your HiringLoop email address, then open this invitation again."
        action={
          <Button
            onClick={() =>
              navigate('/verify-email', {
                state: { from: location },
              })
            }
          >
            Go to email verification
          </Button>
        }
      />
    )
  if (isPending) return <LoadingState label="Accepting invitation" />
  if (accept.isError)
    return (
      <ErrorState
        title="Invitation unavailable"
        description={
          isApiError(accept.error) && accept.error.status === 403
            ? 'This invitation is not available for this account.'
            : 'This invitation is invalid, expired, or no longer available.'
        }
        action={
          <Button
            onClick={() => {
              attemptedToken.current = null
              reset()
            }}
          >
            Try again
          </Button>
        }
      />
    )
  if (isSuccess) return <LoadingState label="Opening workspace" />
  return null
}
