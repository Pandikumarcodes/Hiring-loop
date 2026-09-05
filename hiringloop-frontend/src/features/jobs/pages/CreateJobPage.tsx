import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/ui'
import { JobForm } from '../components/JobForm'
import { useCreateJob, useTransitionJob } from '../hooks/mutations'
import type { JobInput } from '../types/job.types'
import { jobError, validateJob } from '../utils/job-utils'
import { useOrganization } from '../../organizations/hooks/queries'
import { ErrorState, LoadingState } from '../../../shared/components/feedback'
import { can } from '../utils/job-utils'
const initial: JobInput = {
  title: '',
  department: null,
  location: null,
  description: null,
  openings: 1,
}
export function CreateJobPage() {
  const { organizationId = '' } = useParams()
  const navigate = useNavigate()
  const [value, setValue] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const create = useCreateJob(organizationId)
  const opening = useTransitionJob(organizationId, '')
  const organization = useOrganization(organizationId, Boolean(organizationId))
  async function save(open: boolean) {
    const next = validateJob(value, open)
    setErrors(next)
    setFormError('')
    if (Object.keys(next).length) return
    try {
      const created = await create.mutateAsync(value)
      if (!open) {
        navigate(`../${created.id}`, { replace: true })
        return
      }
      try {
        const result = await opening.mutateAsync({
          action: 'open',
          expectedVersion: created.version,
          targetJobId: created.id,
        })
        navigate(`../${result.id}`, { replace: true })
      } catch (error) {
        navigate(`../${created.id}/edit`, {
          replace: true,
          state: {
            notice: jobError(
              error,
              'The draft was saved, but it could not be opened.',
            ),
          },
        })
      }
    } catch (error) {
      setFormError(jobError(error, 'We could not create this job.'))
    }
  }
  if (organization.isPending)
    return <LoadingState label="Checking job access" />
  if (organization.isError || !can(organization.data.permissions, 'job:create'))
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        <ErrorState
          title="Jobs access unavailable"
          description="You do not have permission to create jobs in this workspace."
        />
      </section>
    )
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <PageHeader
        title="Create job"
        description="Create a new role and save it as a draft or open it when ready."
      />
      {formError ? (
        <p
          role="alert"
          className="mb-5 rounded-control border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {formError}
        </p>
      ) : null}
      <JobForm
        value={value}
        errors={errors}
        busy={create.isPending || opening.isPending}
        submitLabel="Save draft"
        secondaryLabel="Save & open"
        onChange={setValue}
        onSubmit={() => void save(false)}
        onSecondary={() => void save(true)}
        onCancel={() => navigate('..')}
      />
    </section>
  )
}
