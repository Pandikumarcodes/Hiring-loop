import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../features/auth/hooks/queries'
import { Card, PageContainer, PageHeader } from '../../shared/components/ui'
import { buttonVariants } from '../../shared/components/ui/button-variants'

export function FoundationPage() {
  const currentUser = useCurrentUser()

  return (
    <PageContainer className="py-10 lg:py-14">
      <Card className="mx-auto max-w-3xl p-6 sm:p-8">
        <p className="eyebrow">Applicant tracking system</p>
        <PageHeader
          title="HiringLoop"
          description="Bring your recruiting work together, from open roles to hiring decisions."
        />
        <p className="text-text-secondary">
          Manage jobs, track candidates through application pipelines, and
          coordinate interviews and scorecards with your team. Follow recruiting
          progress with workspace analytics.
        </p>
        <nav aria-label="Get started" className="mt-6 flex flex-wrap gap-3">
          {currentUser.isUnauthenticated ? (
            <>
              <Link className={buttonVariants()} to="/register">
                Create an account
              </Link>
              <Link
                className={buttonVariants({ variant: 'secondary' })}
                to="/login"
              >
                Log in
              </Link>
            </>
          ) : (
            <Link className={buttonVariants()} to="/app">
              {currentUser.isAuthenticated
                ? 'Open workspace'
                : 'Continue to HiringLoop'}
            </Link>
          )}
        </nav>
      </Card>
    </PageContainer>
  )
}
