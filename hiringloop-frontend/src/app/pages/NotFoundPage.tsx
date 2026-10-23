import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../features/auth/hooks/queries'
import { Card, PageContainer } from '../../shared/components/ui'
import { buttonVariants } from '../../shared/components/ui/button-variants'

export function NotFoundPage({
  context = 'public',
}: {
  context?: 'public' | 'application'
}) {
  const currentUser = useCurrentUser()
  const isApplication = context === 'application'
  return (
    <PageContainer className="py-10 lg:py-14">
      <Card
        className="mx-auto grid max-w-2xl gap-4 p-6 sm:p-8"
        aria-labelledby="not-found-title"
      >
        <p className="eyebrow">404</p>
        <h1
          id="not-found-title"
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Page not found
        </h1>
        <p className="text-text-secondary">
          We couldn't find this page. The link may be incorrect or the page may
          have moved.
        </p>
        <nav aria-label="Page recovery" className="flex flex-wrap gap-3">
          <Link className={buttonVariants()} to={isApplication ? '/app' : '/'}>
            {isApplication ? 'Return to workspace' : 'Return to home'}
          </Link>
          {!isApplication && (
            <Link
              className={buttonVariants({ variant: 'secondary' })}
              to={currentUser.isUnauthenticated ? '/login' : '/app'}
            >
              {currentUser.isUnauthenticated
                ? 'Log in'
                : currentUser.isAuthenticated
                  ? 'Open workspace'
                  : 'Continue to HiringLoop'}
            </Link>
          )}
        </nav>
      </Card>
    </PageContainer>
  )
}
