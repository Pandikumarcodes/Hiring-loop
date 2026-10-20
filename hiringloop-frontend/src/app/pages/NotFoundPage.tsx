import { Link } from 'react-router-dom'
import { Card, PageContainer } from '../../shared/components/ui'

export function NotFoundPage() {
  return (
    <PageContainer className="py-10 lg:py-14">
      <Card
        className="mx-auto grid max-w-2xl gap-4 p-6 sm:p-8"
        aria-labelledby="not-found-title"
      >
        <p className="eyebrow">404</p>
        <h1 id="not-found-title" className="text-3xl font-bold tracking-tight">
          Page not found
        </h1>
        <p className="text-text-secondary">
          The address does not match a page in this frontend foundation.
        </p>
        <div>
          <Link className="ui-button ui-button--primary" to="/">
            Return to foundation home
          </Link>
        </div>
      </Card>
    </PageContainer>
  )
}
