import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import {
  ErrorState,
  EmptyState,
  NoResultsState,
} from '../../../shared/components/feedback'
import {
  Badge,
  Button,
  DataTableShell,
  FilterToolbar,
  Input,
  ListPagination,
  PageContainer,
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
  const visibleJobs = jobs.isPlaceholderData ? undefined : jobs.data
  const visiblePipeline = pipeline.isPlaceholderData ? undefined : pipeline.data
  const data = candidates.isPlaceholderData ? undefined : candidates.data

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
      <PageContainer>
        <ListSkeleton />
      </PageContainer>
    )
  if (organization.isError || !mayList)
    return (
      <PageContainer>
        <ErrorState
          title="Candidate access unavailable"
          description="You do not have permission to view candidates in this workspace."
        />
      </PageContainer>
    )
  if (candidates.isError)
    return (
      <PageContainer>
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
      </PageContainer>
    )

  return (
    <PageContainer>
      <PageHeader
        title="Candidates"
        description="Review candidates and their submitted applications."
      />
      <FilterToolbar
        className="xl:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]"
        resultsSummary={
          data
            ? `${data.pagination.totalItems.toLocaleString()} candidates`
            : null
        }
        clearAction={
          <Button variant="ghost" onClick={clear} disabled={!params.toString()}>
            Clear filters
          </Button>
        }
      >
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
          {visibleJobs?.jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title || 'Untitled job'}
            </option>
          ))}
        </Filter>
        <Filter
          label="Pipeline stage"
          value={params.get('stageId') ?? ''}
          onChange={(value) => update('stageId', value)}
          disabled={
            !selectedJobId ||
            pipeline.isPending ||
            pipeline.isPlaceholderData ||
            pipeline.isError
          }
        >
          <option value="">All stages</option>
          {visiblePipeline?.stages.map((stage) => (
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
      </FilterToolbar>
      {candidates.isPending || candidates.isPlaceholderData || !data ? (
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
          <DataTableShell
            caption="Candidates"
            tableClassName="min-w-[58rem] table-fixed"
          >
            <colgroup>
              {[16, 12, 10, 8, 12].map((width, index) => (
                <col key={index} style={{ width: `${width}rem` }} />
              ))}
            </colgroup>
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
                    className={`px-4 py-3 font-semibold ${heading === 'Applications' ? 'text-right' : ''}`}
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
          </DataTableShell>
          <div className="grid gap-3 xl:hidden">
            {data?.candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                organizationId={organizationId}
              />
            ))}
          </div>
          <ListPagination
            page={data.pagination.page}
            pageSize={data.pagination.limit}
            totalItems={data.pagination.totalItems}
            totalPages={data.pagination.totalPages}
            loading={candidates.isFetching}
            onPageChange={(page) => update('page', String(page))}
          />
        </>
      )}
    </PageContainer>
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
          className="block [overflow-wrap:anywhere] font-bold text-primary-dark hover:underline"
          to={`/app/organizations/${organizationId}/candidates/${candidate.id}`}
          title={candidate.name}
        >
          {candidate.name}
        </Link>
        <span
          className="block max-w-[15rem] [overflow-wrap:anywhere] text-text-secondary"
          title={candidate.email}
        >
          {candidate.email}
        </span>
      </td>
      <td className="max-w-[14rem] px-4 py-4">
        <span
          className="block [overflow-wrap:anywhere]"
          title={latest?.job.title}
        >
          {latest?.job.title ?? 'Not available'}
        </span>
      </td>
      <td className="px-4 py-4">
        {latest?.currentStage ? (
          <Badge variant="info">{latest.currentStage.name}</Badge>
        ) : (
          'Not available'
        )}
      </td>
      <td className="px-4 py-4 text-right tabular-nums">
        {candidate.applicationCount}
      </td>
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
    <article className="min-w-0 rounded-card border border-border bg-surface p-4 shadow-surface">
      <Link
        className="block [overflow-wrap:anywhere] font-bold text-primary-dark hover:underline"
        to={`/app/organizations/${organizationId}/candidates/${candidate.id}`}
        title={candidate.name}
      >
        {candidate.name}
      </Link>
      <p
        className="mt-1 [overflow-wrap:anywhere] text-sm text-text-secondary"
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
      <dd
        className="min-w-0 [overflow-wrap:anywhere] font-medium"
        title={value}
      >
        {label === 'Current stage' && value !== 'Not available' ? (
          <Badge variant="info">{value}</Badge>
        ) : (
          value
        )}
      </dd>
    </div>
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
