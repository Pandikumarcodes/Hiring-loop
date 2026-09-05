import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader } from '../../../shared/components/ui'
import { ErrorState, LoadingState } from '../../../shared/components/feedback'
import { isApiError } from '../../../shared/lib/apiErrors'
import { JobForm } from '../components/JobForm'
import { useUpdateJob } from '../hooks/mutations'
import { useJob } from '../hooks/queries'
import type { JobInput } from '../types/job.types'
import { can, detailToInput, jobError, validateJob } from '../utils/job-utils'
import { useOrganization } from '../../organizations/hooks/queries'
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
  const [value, setValue] = useState<JobInput | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState(
    (location.state as { notice?: string } | null)?.notice ?? '',
  )
  const conflict =
    isApiError(update.error) && update.error.code === 'JOB_VERSION_CONFLICT'
  // Initialize once from server state; later cache changes must not erase edits.
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- protect in-progress edits
    if (query.data && !value) setValue(detailToInput(query.data))
  }, [query.data, value])
  if (organization.isPending)
    return <LoadingState label="Checking job access" />
  if (organization.isError || !mayUpdate)
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
  if (query.isPending || !query.data || !value)
    return <LoadingState label="Loading job" />
  if (query.data.status === 'ARCHIVED')
    return (
      <Wrap>
        <ErrorState
          title="Archived job"
          description="Archived jobs are view-only."
          action={<Button onClick={() => navigate('..')}>View job</Button>}
        />
      </Wrap>
    )
  const currentValue = value
  const currentJob = query.data
  async function save() {
    const next = validateJob(currentValue)
    setErrors(next)
    setMessage('')
    if (Object.keys(next).length) return
    try {
      await update.mutateAsync({
        ...currentValue,
        expectedVersion: currentJob.version,
      })
      navigate('..', { replace: true })
    } catch (error) {
      setMessage(jobError(error, 'We could not save your changes.'))
    }
  }
  async function reload() {
    const latest = await query.refetch()
    if (latest.data) setValue(detailToInput(latest.data))
    update.reset()
    setMessage('')
  }
  return (
    <Wrap>
      <PageHeader
        title="Edit job"
        description="Update the role details. Lifecycle status is managed separately."
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
        value={value}
        errors={errors}
        busy={update.isPending}
        submitLabel="Save changes"
        onChange={setValue}
        onSubmit={() => void save()}
        onCancel={() => navigate('..')}
      />
    </Wrap>
  )
}
const Wrap = ({ children }: { children: React.ReactNode }) => (
  <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
    {children}
  </section>
)
