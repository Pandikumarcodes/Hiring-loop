import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../shared/components/feedback'
import { Button } from '../../../shared/components/ui'
import { usePublicCareerJobs } from '../hooks/queries'
import {
  PUBLIC_CAREER_PAGE_SIZE,
  employmentLabel,
  isUnavailable,
  publicWebsiteHref,
  setCareerMetadata,
  workplaceLabel,
} from '../utils/public-career-utils'

export function PublicCareerPage() {
  const { organizationSlug = '' } = useParams()
  const [page, setPage] = useState(1)
  const query = usePublicCareerJobs(
    organizationSlug,
    page,
    PUBLIC_CAREER_PAGE_SIZE,
  )
  const data = query.data

  useEffect(() => {
    if (data)
      return setCareerMetadata(
        `Careers at ${data.organization.name} | HiringLoop`,
        data.organization.description ??
          `Open positions at ${data.organization.name}.`,
      )
  }, [data])
  if (query.isPending && !data)
    return (
      <CareerWrap>
        <LoadingState label="Loading open positions" />
      </CareerWrap>
    )
  if (query.isError)
    return (
      <CareerWrap>
        <ErrorState
          title={
            isUnavailable(query.error)
              ? "This careers page isn't available."
              : "We couldn't load this careers page."
          }
          onRetry={
            isUnavailable(query.error) ? undefined : () => void query.refetch()
          }
        />
      </CareerWrap>
    )
  if (!data) return null
  const { organization, jobs, pagination } = data
  const websiteHref = publicWebsiteHref(organization.website)
  return (
    <CareerWrap>
      <header className="mb-10 max-w-3xl">
        <p className="mb-3 text-sm font-bold uppercase tracking-wider text-primary-dark">
          HiringLoop careers
        </p>
        <h1 className="break-words text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
          Careers at {organization.name}
        </h1>
        {organization.description ? (
          <p className="mt-4 whitespace-pre-wrap break-words text-lg leading-7 text-text-secondary">
            {organization.description}
          </p>
        ) : null}
        {websiteHref ? (
          <a
            className="mt-4 inline-block break-all font-semibold text-primary-dark underline"
            href={websiteHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit {organization.name} website{' '}
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : null}
      </header>
      <section aria-labelledby="open-positions">
        <h2 id="open-positions" className="mb-5 text-2xl font-bold">
          Open positions
        </h2>
        {jobs.length === 0 ? (
          <EmptyState
            title="No open positions right now"
            description="Please check back later for new opportunities."
          />
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <Link
                key={job.id}
                className="block rounded-card border border-border bg-surface p-5 shadow-sm transition-colors hover:border-primary focus-visible:outline-3 focus-visible:outline-primary-dark sm:p-6"
                to={`/careers/${encodeURIComponent(organizationSlug)}/jobs/${encodeURIComponent(job.id)}`}
              >
                <h3 className="break-words text-lg font-bold text-text-primary">
                  {job.title}
                </h3>
                <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-secondary">
                  {employmentLabel(job.employmentType) ? (
                    <div>
                      <dt className="sr-only">Employment type</dt>
                      <dd>{employmentLabel(job.employmentType)}</dd>
                    </div>
                  ) : null}
                  {workplaceLabel(job.workplaceType) ? (
                    <div>
                      <dt className="sr-only">Workplace type</dt>
                      <dd>{workplaceLabel(job.workplaceType)}</dd>
                    </div>
                  ) : null}
                  {job.location ? (
                    <div>
                      <dt className="sr-only">Location</dt>
                      <dd className="break-words">{job.location}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="sr-only">Openings</dt>
                    <dd>
                      {job.openings}{' '}
                      {job.openings === 1 ? 'opening' : 'openings'}
                    </dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
        )}
      </section>
      {pagination.totalPages > 1 ? (
        <nav
          className="mt-8 flex items-center justify-between gap-4"
          aria-label="Open positions pages"
        >
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <p className="text-sm text-text-secondary" aria-live="polite">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <Button
            variant="secondary"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </nav>
      ) : null}
    </CareerWrap>
  )
}
const CareerWrap = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
    {children}
  </div>
)
