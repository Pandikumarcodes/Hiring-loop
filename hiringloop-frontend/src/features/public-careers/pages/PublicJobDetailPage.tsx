import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../../shared/components/feedback'
import { usePublicCareerJob } from '../hooks/queries'
import {
  employmentLabel,
  isUnavailable,
  publicWebsiteHref,
  setCareerMetadata,
  workplaceLabel,
} from '../utils/public-career-utils'

export function PublicJobDetailPage() {
  const { organizationSlug = '', jobId = '' } = useParams()
  const query = usePublicCareerJob(organizationSlug, jobId)
  const data = query.data
  useEffect(() => {
    if (data)
      return setCareerMetadata(
        `${data.job.title} at ${data.organization.name} | HiringLoop`,
        data.job.description ??
          `Learn about ${data.job.title} at ${data.organization.name}.`,
      )
  }, [data])
  const careersUrl = `/careers/${encodeURIComponent(organizationSlug)}`
  if (query.isPending)
    return (
      <Wrap>
        <LoadingState label="Loading job" />
      </Wrap>
    )
  if (query.isError)
    return (
      <Wrap>
        <ErrorState
          title={
            isUnavailable(query.error)
              ? 'This job is no longer available.'
              : "We couldn't load this job."
          }
          onRetry={
            isUnavailable(query.error) ? undefined : () => void query.refetch()
          }
          action={
            isUnavailable(query.error) ? (
              <Link
                className="font-semibold text-primary-dark underline"
                to={careersUrl}
              >
                All open positions
              </Link>
            ) : undefined
          }
        />
      </Wrap>
    )
  if (!data) return null
  const { organization, job } = data
  const websiteHref = publicWebsiteHref(organization.website)
  return (
    <Wrap>
      <Link
        className="font-semibold text-primary-dark underline"
        to={careersUrl}
      >
        All open positions
      </Link>
      <article className="mt-8">
        <p className="text-sm font-bold uppercase tracking-wider text-primary-dark">
          {organization.name}
        </p>
        <h1 className="mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl">
          {job.title}
        </h1>
        <dl className="mt-6 grid grid-cols-1 gap-4 text-text-secondary sm:grid-cols-2 lg:grid-cols-4">
          {employmentLabel(job.employmentType) ? (
            <div className="min-w-0">
              <dt className="text-sm font-semibold text-text-primary">
                Employment type
              </dt>
              <dd className="mt-1 break-words">
                {employmentLabel(job.employmentType)}
              </dd>
            </div>
          ) : null}
          {workplaceLabel(job.workplaceType) ? (
            <div className="min-w-0">
              <dt className="text-sm font-semibold text-text-primary">
                Workplace type
              </dt>
              <dd className="mt-1 break-words">
                {workplaceLabel(job.workplaceType)}
              </dd>
            </div>
          ) : null}
          {job.location ? (
            <div className="min-w-0">
              <dt className="text-sm font-semibold text-text-primary">
                Location
              </dt>
              <dd className="mt-1 break-words">{job.location}</dd>
            </div>
          ) : null}
          <div className="min-w-0">
            <dt className="text-sm font-semibold text-text-primary">
              Openings
            </dt>
            <dd className="mt-1 break-words">{job.openings}</dd>
          </div>
        </dl>
        <section className="mt-10 rounded-card border border-border bg-surface p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-bold">About the role</h2>
          <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-text-primary">
            {job.description ?? 'No description has been provided.'}
          </p>
        </section>
        <section className="mt-6 rounded-card border border-border bg-surface p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-bold">About {organization.name}</h2>
          {organization.description ? (
            <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-text-secondary">
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
              Visit company website{' '}
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : null}
        </section>
      </article>
    </Wrap>
  )
}
const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
    {children}
  </div>
)
