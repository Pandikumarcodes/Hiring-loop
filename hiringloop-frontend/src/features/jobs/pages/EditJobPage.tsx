import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Badge,
  Button,
  PageContainer,
  PageHeader,
} from '../../../shared/components/ui'
import { ErrorState, LoadingState } from '../../../shared/components/feedback'
import { isApiError } from '../../../shared/lib/apiErrors'
import { JobForm } from '../components/JobForm'
import { useUpdateJob } from '../hooks/mutations'
import { useJob } from '../hooks/queries'
import type { JobInput } from '../types/job.types'
import {
  can,
  detailToInput,
  jobError,
  jobTitle,
  validateJob,
} from '../utils/job-utils'
import { useOrganization } from '../../organizations/hooks/queries'
import { jobRoutes } from '../utils/job-routes'
export function EditJobPage() {
  const { organizationId = '', jobId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const organization = useOrganization(organizationId, Boolean(organizationId))
  const mayUpdate = can(organization.data?.permissions, 'job:update')
  const query = useJob(
    organizationId,
    jobId,
    Boolean(organizationId && jobId && mayUpdate),
  )
  const update = useUpdateJob(organizationId, jobId)
  const [draft, setDraft] = useState<{
    key: string
    value: JobInput
    version: number
  } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState(
    (location.state as { notice?: string } | null)?.notice ?? '',
  )
  const conflict =
    isApiError(update.error) && update.error.code === 'JOB_VERSION_CONFLICT'
  const draftKey = `${organizationId}:${jobId}`
  // Initialize once from server state; later cache changes must not erase edits.
  useEffect(() => {
    if (query.data && draft?.key !== draftKey)
      // oxlint-disable-next-line react/set-state-in-effect -- initialize once while protecting in-progress edits
      setDraft({
        key: draftKey,
        value: detailToInput(query.data),
        version: query.data.version,
      })
  }, [query.data, draft, draftKey])
  if (organization.isPending)
    return <LoadingState label="Checking job access" />
  if (organization.isError)
    return (
      <Wrap>
        <ErrorState
          title="Workspace unavailable"
          description="We could not check job access."
          onRetry={() => void organization.refetch()}
        />
      </Wrap>
    )
  if (!mayUpdate)
    return (
      <Wrap>
        <ErrorState
          title="Jobs access unavailable"
          description="You do not have permission to edit jobs in this workspace."
        />
      </Wrap>
    )
  if (query.isError)
    return (
      <Wrap>
        <ErrorState
          description={jobError(query.error, 'We could not load this job.')}
          onRetry={() => void query.refetch()}
        />
      </Wrap>
    )
  if (query.isPending || !query.data || !draft || draft.key !== draftKey)
    return <LoadingState label="Loading job" />
  if (query.data.status === 'ARCHIVED')
    return (
      <Wrap>
        <ErrorState
          title="Archived job"
          description="Archived jobs are view-only."
          action={
            <Button
              onClick={() => navigate(jobRoutes.detail(organizationId, jobId))}
            >
              View job
            </Button>
          }
        />
      </Wrap>
    )
  const currentValue = draft.value
  const currentVersion = draft.version
  const currentJob = query.data
  async function save() {
    if (update.isPending) return
    const next = validateJob(currentValue)
    setErrors(next)
    setMessage('')
    if (Object.keys(next).length) return
    try {
      await update.mutateAsync({
        ...currentValue,
        expectedVersion: currentVersion,
      })
      navigate(jobRoutes.detail(organizationId, jobId), { replace: true })
    } catch (error) {
      setMessage(jobError(error, 'We could not save your changes.'))
    }
  }
  async function reload() {
    const latest = await query.refetch()
    if (latest.isSuccess)
      setDraft({
        key: draftKey,
        value: detailToInput(latest.data),
        version: latest.data.version,
      })
    update.reset()
    setMessage('')
  }
  return (
    <Wrap>
      <PageHeader
        breadcrumbs={
          <Link
            className="font-semibold text-text-secondary hover:text-primary-dark hover:underline"
            to={jobRoutes.detail(organizationId, jobId)}
          >
            {jobTitle(currentJob.title)}
          </Link>
        }
        title={`Edit ${jobTitle(currentJob.title)}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Update the role details. Lifecycle status is managed separately.{' '}
            <Badge variant="neutral">{currentJob.status}</Badge>
          </span>
        }
      />
      {message ? (
        <div
          role="alert"
          className="mb-5 rounded-control border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          {message}
          {conflict ? (
            <div className="mt-3">
              <Button variant="secondary" onClick={() => void reload()}>
                Reload job
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <JobForm
        value={draft.value}
        errors={errors}
        busy={update.isPending}
        submitLabel="Save changes"
        onChange={(value) => setDraft({ ...draft, value })}
        onSubmit={() => void save()}
        onCancel={() => navigate(jobRoutes.detail(organizationId, jobId))}
      />
    </Wrap>
  )
}
const Wrap = ({ children }: { children: React.ReactNode }) => (
  <PageContainer width="standard">{children}</PageContainer>
)
