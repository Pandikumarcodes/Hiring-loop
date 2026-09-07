import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import {
  ErrorState,
  EmptyState,
  NoResultsState,
} from '../../../shared/components/feedback'
import {
  Button,
  Input,
  PageHeader,
  Select,
} from '../../../shared/components/ui'
import { isApiError } from '../../../shared/lib/apiErrors'
import { useOrganization } from '../../organizations/hooks/queries'
import { useJobs } from '../../jobs/hooks/queries'
import { usePipeline } from '../../pipelines/hooks/queries'
import { useCandidates } from '../hooks/queries'
import {
  CANDIDATE_SORTS,
  type CandidateListFilters,
} from '../types/candidate-management.types'
import {
  canViewCandidates,
  candidateError,
  formatCandidateDate,
  parseCandidateSort,
} from '../utils/candidate-management-utils'

const defaultFilters: CandidateListFilters = {
  page: 1,
  pageSize: 25,
  sort: 'newestApplication',
}

const jobOptions = {
  page: 1,
  limit: 100,
  sortBy: 'title' as const,
  sortOrder: 'asc' as const,
}

export function CandidatesPage() {
  const { organizationId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const organization = useOrganization(organizationId, Boolean(organizationId))
  const mayList = canViewCandidates(organization.data?.permissions)
  const filters = parseFilters(params)
  const [search, setSearch] = useState(params.get('search') ?? '')

  // Keep the text field in sync with browser back/forward navigation.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setSearch(params.get('search') ?? ''), [params])
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() === (params.get('search') ?? '')) return
      const next = new URLSearchParams(params)
      setOrDelete(next, 'search', search.trim())
      next.delete('page')
      setParams(next, { replace: true })
    }, 300)
    return () => clearTimeout(timer)
  }, [search, params, setParams])

  const jobs = useJobs(
    organizationId,
    jobOptions,
    Boolean(organizationId && mayList),
  )
  const selectedJobId = params.get('jobId') ?? ''
  const pipeline = usePipeline(
    organizationId,
    selectedJobId,
    Boolean(organizationId && mayList && selectedJobId),
  )
  const candidates = useCandidates(
    organizationId,
    filters,
    Boolean(organizationId && mayList),
  )

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    setOrDelete(next, key, value)
    if (key !== 'page') next.delete('page')
    if (key === 'jobId') next.delete('stageId')
    setParams(next)
  }
  const clear = () => {
    setSearch('')
    setParams({})
  }
  const hasFilters = Boolean(
    params.get('search') || params.get('jobId') || params.get('stageId'),
  )

  if (organization.isPending)
    return (
      <Page>
        <ListSkeleton />
      </Page>
    )
  if (organization.isError || !mayList)
    return (
      <Page>
        <ErrorState
          title="Candidate access unavailable"
          description="You do not have permission to view candidates in this workspace."
        />
      </Page>
    )
  if (candidates.isError)
    return (
      <Page>
        <ErrorState
          title={
            isApiError(candidates.error) && candidates.error.status === 403
              ? 'Candidate access unavailable'
              : undefined
          }
          description={candidateError(
            candidates.error,
            'We could not load candidates.',
          )}
          onRetry={() => void candidates.refetch()}
        />
      </Page>
    )

  const data = candidates.data
  return (
    <Page>
      <PageHeader
        title="Candidates"
        description="Review candidates and their submitted applications."
      />
      <div className="mb-6 grid min-w-0 gap-3 rounded-card border border-border bg-surface p-4 shadow-sm lg:grid-cols-[minmax(14rem,1fr)_repeat(3,minmax(10rem,auto))_auto]">
        <label className="relative min-w-0">
          <span className="sr-only">Search candidates by name or email</span>
          <Search
            className="absolute left-3 top-3.5 h-4 w-4 text-text-secondary"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Search name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search candidates by name or email"
          />
        </label>
        <Filter
          label="Job"
          value={selectedJobId}
          onChange={(value) => update('jobId', value)}
        >
          <option value="">All jobs</option>
          {jobs.data?.jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title || 'Untitled job'}
            </option>
          ))}
        </Filter>
        <Filter
          label="Pipeline stage"
          value={params.get('stageId') ?? ''}
          onChange={(value) => update('stageId', value)}
          disabled={!selectedJobId || pipeline.isPending || pipeline.isError}
        >
          <option value="">All stages</option>
          {pipeline.data?.stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </Filter>
        <Filter
          label="Sort"
          value={filters.sort}
          onChange={(value) => update('sort', value)}
        >
          {CANDIDATE_SORTS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Filter>
        <Button variant="ghost" onClick={clear} disabled={!params.toString()}>
          Clear filters
        </Button>
      </div>
      {candidates.isPending ? (
        <ListSkeleton />
      ) : data?.candidates.length === 0 ? (
        hasFilters ? (
          <NoResultsState
            title="No candidates match your filters."
            description="Try adjusting or clearing the current filters."
            action={
              <Button variant="secondary" onClick={clear}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No candidates yet"
            description="Submitted applications will appear here."
          />
        )
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-card border border-border bg-surface shadow-sm md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">Candidates</caption>
              <thead className="bg-slate-50 text-text-secondary">
                <tr>
                  {[
                    'Candidate',
                    'Latest job',
                    'Current stage',
                    'Applications',
                    'Latest submitted',
                  ].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 font-semibold"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.candidates.map((candidate) => (
                  <CandidateRow
                    key={candidate.id}
                    candidate={candidate}
                    organizationId={organizationId}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {data?.candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                organizationId={organizationId}
              />
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              disabled={filters.page <= 1}
              onClick={() => update('page', String(filters.page - 1))}
            >
              Previous
            </Button>
            <span className="text-center text-sm text-text-secondary">
              Page {data?.pagination.page ?? filters.page} of{' '}
              {Math.max(1, data?.pagination.totalPages ?? 1)}
            </span>
            <Button
              variant="secondary"
              disabled={filters.page >= (data?.pagination.totalPages ?? 1)}
              onClick={() => update('page', String(filters.page + 1))}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </Page>
  )
}

function CandidateRow({
  candidate,
  organizationId,
}: {
  candidate: NonNullable<
    ReturnType<typeof useCandidates>['data']
  >['candidates'][number]
  organizationId: string
}) {
  const latest = candidate.latestApplication
  return (
    <tr className="border-t border-border align-middle">
      <td className="max-w-[15rem] px-4 py-4">
        <Link
          className="block truncate font-bold text-primary-dark hover:underline"
          to={`/app/organizations/${organizationId}/candidates/${candidate.id}`}
          title={candidate.name}
        >
          {candidate.name}
        </Link>
        <span
          className="block max-w-[15rem] truncate text-text-secondary"
          title={candidate.email}
        >
          {candidate.email}
        </span>
      </td>
      <td className="max-w-[14rem] px-4 py-4">
        <span className="block truncate" title={latest?.job.title}>
          {latest?.job.title ?? 'Not available'}
        </span>
      </td>
      <td className="px-4 py-4">
        {latest?.currentStage?.name ?? 'Not available'}
      </td>
      <td className="px-4 py-4">{candidate.applicationCount}</td>
      <td className="whitespace-nowrap px-4 py-4">
        {formatCandidateDate(latest?.submittedAt)}
      </td>
    </tr>
  )
}

function CandidateCard({
  candidate,
  organizationId,
}: {
  candidate: NonNullable<
    ReturnType<typeof useCandidates>['data']
  >['candidates'][number]
  organizationId: string
}) {
  const latest = candidate.latestApplication
  return (
    <article className="min-w-0 rounded-card border border-border bg-surface p-4 shadow-sm">
      <Link
        className="block truncate font-bold text-primary-dark hover:underline"
        to={`/app/organizations/${organizationId}/candidates/${candidate.id}`}
        title={candidate.name}
      >
        {candidate.name}
      </Link>
      <p
        className="mt-1 truncate text-sm text-text-secondary"
        title={candidate.email}
      >
        {candidate.email}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Meta label="Latest job" value={latest?.job.title ?? 'Not available'} />
        <Meta
          label="Current stage"
          value={latest?.currentStage?.name ?? 'Not available'}
        />
        <Meta label="Applications" value={String(candidate.applicationCount)} />
        <Meta
          label="Submitted"
          value={formatCandidateDate(latest?.submittedAt)}
        />
      </dl>
    </article>
  )
}

function parseFilters(params: URLSearchParams): CandidateListFilters {
  const page = Number(params.get('page'))
  return {
    ...defaultFilters,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    search: params.get('search') || undefined,
    jobId: params.get('jobId') || undefined,
    stageId: params.get('stageId') || undefined,
    sort: parseCandidateSort(params.get('sort')),
  }
}

function setOrDelete(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value)
  else params.delete(key)
}

function Filter({
  label,
  children,
  onChange,
  ...props
}: {
  label: string
  children: React.ReactNode
  onChange: (value: string) => void
} & Omit<React.ComponentProps<typeof Select>, 'onChange'>) {
  return (
    <label className="min-w-0">
      <span className="sr-only">{label}</span>
      <Select
        aria-label={label}
        {...props}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </Select>
    </label>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="truncate font-medium" title={value}>
        {value}
      </dd>
    </div>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-7xl min-w-0 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {children}
    </section>
  )
}

function ListSkeleton() {
  return (
    <div aria-label="Loading candidates" role="status" className="grid gap-3">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="h-16 animate-pulse rounded-card bg-slate-200"
        />
      ))}
    </div>
  )
}
