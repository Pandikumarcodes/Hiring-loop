import { isApiError } from '../../../shared/lib/apiErrors'
import type { JobStatus } from '../../jobs/types/job.types'

export const canConfigurePipeline = (
  permissions: readonly string[] | undefined,
) => permissions?.includes('pipeline:configure') ?? false
export const canViewPipeline = (permissions: readonly string[] | undefined) =>
  permissions?.includes('pipeline:view') ?? false
export const pipelineEditableForJob = (status: JobStatus) =>
  status === 'DRAFT' || status === 'OPEN'

export function pipelineError(
  error: unknown,
  fallback = 'We could not update the pipeline.',
) {
  if (!isApiError(error)) return fallback
  if (error.code === 'PIPELINE_VERSION_CONFLICT')
    return 'The pipeline changed since you opened it. We loaded the latest version. Review the stages and try again.'
  if (error.code === 'PIPELINE_JOB_LOCKED')
    return 'This pipeline is read-only because the job is closed or archived.'
  if (error.code.includes('DUPLICATE'))
    return 'A stage with that name already exists.'
  if (error.code.includes('LIMIT'))
    return 'This pipeline already has the maximum of 20 stages.'
  if (error.code.includes('ENTRY'))
    return 'The entry stage cannot be moved or deleted.'
  if (error.code.includes('ORDER'))
    return 'The requested stage order is no longer valid. Reload and try again.'
  if (error.status === 403 || error.status === 404)
    return 'This pipeline is no longer available to you.'
  return fallback
}

export function validateStageName(value: string) {
  const name = value.trim()
  if (!name) return 'Enter a stage name.'
  if (name.length > 80) return 'Use 80 characters or fewer.'
  return undefined
}
