import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import {
  Button,
  Input,
  PageHeader,
  Select,
} from '../../../shared/components/ui'
import {
  EmptyState,
  ErrorState,
  NoResultsState,
} from '../../../shared/components/feedback'
import { isApiError } from '../../../shared/lib/apiErrors'
import { JobActions } from '../components/JobActions'
import { JobStatusBadge } from '../components/JobStatusBadge'
import { useTransitionJob } from '../hooks/mutations'
import { useJobs } from '../hooks/queries'
import {
  EMPLOYMENT_TYPES,
  JOB_STATUSES,
  WORKPLACE_TYPES,
  type EmploymentType,
  type JobFilters,
  type JobSortBy,
  type JobStatus,
  type SortOrder,
  type WorkplaceType,
} from '../types/job.types'
import {
  employmentLabel,
  formatJobDate,
  jobError,
  workplaceLabel,
  can,
  jobTitle,
} from '../utils/job-utils'
import { ConfirmDialog } from '../../team/components/ConfirmDialog'
import { useOrganization } from '../../organizations/hooks/queries'
const defaults: JobFilters = {
  page: 1,
  limit: 20,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
}
export function JobsPage() {
  const { organizationId = '' } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const filters = parseFilters(params)
  const [search, setSearch] = useState(params.get('search') ?? '')
  const organization = useOrganization(organizationId, Boolean(organizationId))
  // Browser history may replace the URL independently of the controlled input.
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
  const mayList = can(organization.data?.permissions, 'job:list')
  const query = useJobs(
    organizationId,
    filters,
    Boolean(organizationId && mayList),
  )
  const [pending, setPending] = useState<{
    id: string
    title: string
    action: 'open' | 'close' | 'reopen' | 'archive'
    version: number
  } | null>(null)
  const transition = useTransitionJob(organizationId, pending?.id ?? '')
  const conflict =
    isApiError(transition.error) &&
    transition.error.code === 'JOB_VERSION_CONFLICT'
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    setOrDelete(next, key, value)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }
  const clear = () => {
    setSearch('')
    setParams({})
  }
  const filtered = Boolean(
    params.get('search') ||
      params.get('status') ||
      params.get('employmentType') ||
      params.get('workplaceType'),
  )
  if (organization.isPending)
    return (
      <Page>
        <JobSkeleton />
      </Page>
    )
  if (organization.isError || !mayList)
    return (
      <Page>
        <ErrorState
          title="Jobs access unavailable"
          description="You do not have permission to view jobs in this workspace."
        />
      </Page>
    )
  if (query.isError && isApiError(query.error) && query.error.status === 403)
    return (
      <Page>
        <ErrorState
          title="Jobs access unavailable"
          description="You do not have permission to view jobs in this workspace."
        />
      </Page>
    )
  if (query.isError)
    return (
      <Page>
        <ErrorState
          description={jobError(query.error, 'We could not load jobs.')}
          onRetry={() => void query.refetch()}
        />
      </Page>
    )
  return (
    <Page>
      <PageHeader
        title="Jobs"
        description="Manage open roles and draft positions."
        actions={
          can(organization.data.permissions, 'job:create') ? (
            <Button onClick={() => navigate('new')}>New job</Button>
          ) : null
        }
      />
      <div className="mb-6 grid gap-3 rounded-card border border-border bg-surface p-4 shadow-sm lg:grid-cols-[minmax(14rem,1fr)_repeat(4,minmax(9rem,auto))_auto]">
        <label className="relative">
          <span className="sr-only">Search jobs</span>
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-text-secondary" />
          <Input
            className="pl-9"
            placeholder="Search jobs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Filter
          label="Status"
          value={params.get('status') ?? ''}
          onChange={(v) => update('status', v)}
          options={JOB_STATUSES.map((v) => [
            v,
            v[0] + v.slice(1).toLowerCase(),
          ])}
        />
        <Filter
          label="Employment type"
          value={params.get('employmentType') ?? ''}
          onChange={(v) => update('employmentType', v)}
          options={EMPLOYMENT_TYPES.map((v) => [v, employmentLabel(v)])}
        />
        <Filter
          label="Workplace"
          value={params.get('workplaceType') ?? ''}
          onChange={(v) => update('workplaceType', v)}
          options={WORKPLACE_TYPES.map((v) => [v, workplaceLabel(v)])}
        />
        <Filter
          label="Sort"
          value={`${filters.sortBy}:${filters.sortOrder}`}
          onChange={(v) => {
            const [sortBy, sortOrder] = v.split(':')
            const next = new URLSearchParams(params)
            setOrDelete(next, 'sortBy', sortBy === 'updatedAt' ? '' : sortBy)
            setOrDelete(
              next,
              'sortOrder',
              sortOrder === 'desc' ? '' : sortOrder,
            )
            next.delete('page')
            setParams(next)
          }}
          options={[
            ['updatedAt:desc', 'Recently updated'],
            ['createdAt:desc', 'Newest created'],
            ['title:asc', 'Title A–Z'],
            ['openedAt:desc', 'Recently opened'],
          ]}
        />
        <Button variant="ghost" onClick={clear} disabled={!params.toString()}>
          Clear filters
        </Button>
      </div>
      {query.isPending ? (
        <JobSkeleton />
      ) : query.data.jobs.length === 0 ? (
        filtered ? (
          <NoResultsState
            title="No jobs match your filters."
            description="Try adjusting or clearing the current filters."
            action={
              <Button variant="secondary" onClick={clear}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No jobs yet"
            description="Create your first job and start building your hiring workflow."
            action={
              can(organization.data.permissions, 'job:create') ? (
                <Button onClick={() => navigate('new')}>Create job</Button>
              ) : undefined
            }
          />
        )
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-card border border-border bg-surface shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-text-secondary">
                <tr>
                  {[
                    'Job title',
                    'Status',
                    'Department',
                    'Employment type',
                    'Workplace',
                    'Openings',
                    'Updated',
                    'Actions',
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.jobs.map((j) => (
                  <tr key={j.id} className="border-t border-border">
                    <td className="px-4 py-4 font-bold">
                      <Link
                        className="text-primary-dark hover:underline"
                        to={j.id}
                      >
                        {jobTitle(j.title)}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <JobStatusBadge status={j.status} />
                    </td>
                    <td className="px-4 py-4">{j.department ?? '—'}</td>
                    <td className="px-4 py-4">
                      {employmentLabel(j.employmentType)}
                    </td>
                    <td className="px-4 py-4">
                      {workplaceLabel(j.workplaceType)}
                    </td>
                    <td className="px-4 py-4">{j.openings}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {formatJobDate(j.updatedAt)}
                    </td>
                    <td className="px-4 py-2">
                      <JobActions
                        job={j}
                        onEdit={() => navigate(`${j.id}/edit`)}
                        onAction={(action) =>
                          setPending({
                            id: j.id,
                            title: jobTitle(j.title),
                            action,
                            version: j.version,
                          })
                        }
                        permissions={organization.data.permissions}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {query.data.jobs.map((j) => (
              <article
                key={j.id}
                className="rounded-card border border-border bg-surface p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link className="font-bold text-primary-dark" to={j.id}>
                      {jobTitle(j.title)}
                    </Link>
                    <div className="mt-2">
                      <JobStatusBadge status={j.status} />
                    </div>
                  </div>
                  <JobActions
                    job={j}
                    onEdit={() => navigate(`${j.id}/edit`)}
                    onAction={(action) =>
                      setPending({
                        id: j.id,
                        title: jobTitle(j.title),
                        action,
                        version: j.version,
                      })
                    }
                    permissions={organization.data.permissions}
                  />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Meta k="Department" v={j.department ?? '—'} />
                  <Meta k="Employment" v={employmentLabel(j.employmentType)} />
                  <Meta k="Workplace" v={workplaceLabel(j.workplaceType)} />
                  <Meta k="Openings" v={String(j.openings)} />
                  <Meta k="Updated" v={formatJobDate(j.updatedAt)} />
                </dl>
              </article>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="secondary"
              disabled={filters.page <= 1}
              onClick={() => update('page', String(filters.page - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-text-secondary">
              Page {query.data.pagination.page} of{' '}
              {Math.max(1, query.data.pagination.totalPages)}
            </span>
            <Button
              variant="secondary"
              disabled={filters.page >= query.data.pagination.totalPages}
              onClick={() => update('page', String(filters.page + 1))}
            >
              Next
            </Button>
          </div>
        </>
      )}
      {transition.isError ? (
        <div className="mt-4 text-sm text-error" role="alert">
          {jobError(transition.error, 'We could not update this job.')}
          {conflict ? (
            <div className="mt-3">
              <Button
                variant="secondary"
                onClick={() => {
                  void query.refetch()
                  transition.reset()
                }}
              >
                Reload jobs
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {pending ? (
        <ConfirmDialog
          title={`${pending.action[0].toUpperCase() + pending.action.slice(1)} ${pending.title}?`}
          description={
            pending.action === 'archive'
              ? 'Archiving is terminal. This job will become view-only.'
              : `This will ${pending.action} the job.`
          }
          confirmLabel={
            pending.action[0].toUpperCase() + pending.action.slice(1)
          }
          danger={pending.action === 'archive'}
          busy={transition.isPending}
          onCancel={() => setPending(null)}
          onConfirm={() =>
            void transition
              .mutateAsync({
                action: pending.action,
                expectedVersion: pending.version,
              })
              .then(() => setPending(null))
              .catch(() => {})
          }
        />
      ) : null}
    </Page>
  )
}
function parseFilters(p: URLSearchParams): JobFilters {
  const page = Number(p.get('page'))
  const sort = p.get('sortBy')
  const order = p.get('sortOrder')
  return {
    ...defaults,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    search: p.get('search') || undefined,
    status: (p.get('status') as JobStatus) || undefined,
    employmentType: (p.get('employmentType') as EmploymentType) || undefined,
    workplaceType: (p.get('workplaceType') as WorkplaceType) || undefined,
    sortBy: (['updatedAt', 'createdAt', 'title', 'openedAt'].includes(
      sort ?? '',
    )
      ? sort
      : 'updatedAt') as JobSortBy,
    sortOrder: (order === 'asc' ? 'asc' : 'desc') as SortOrder,
  }
}
function setOrDelete(p: URLSearchParams, k: string, v: string) {
  if (v) p.set(k, v)
  else p.delete(k)
}
const Page = ({ children }: { children: React.ReactNode }) => (
  <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
    {children}
  </section>
)
function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[][]
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <Select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
    </label>
  )
}
const Meta = ({ k, v }: { k: string; v: string }) => (
  <div>
    <dt className="text-text-secondary">{k}</dt>
    <dd className="mt-1 font-medium">{v}</dd>
  </div>
)
const JobSkeleton = () => (
  <div aria-label="Loading jobs" role="status" className="grid gap-3">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="h-16 animate-pulse rounded-card bg-slate-200" />
    ))}
  </div>
)
