import { isApiError } from '../../../shared/lib/apiErrors'
import type {
  EmploymentType,
  JobDetailDto,
  JobInput,
  JobStatus,
  WorkplaceType,
} from '../types/job.types'
export const employmentLabel = (v: EmploymentType | null | undefined) =>
  v
    ? {
        FULL_TIME: 'Full time',
        PART_TIME: 'Part time',
        CONTRACT: 'Contract',
        TEMPORARY: 'Temporary',
        INTERNSHIP: 'Internship',
        OTHER: 'Other',
      }[v]
    : 'Not set'
export const workplaceLabel = (v: WorkplaceType | null | undefined) =>
  v ? { ONSITE: 'On-site', HYBRID: 'Hybrid', REMOTE: 'Remote' }[v] : 'Not set'
export const statusVariant = (s: JobStatus) =>
  (
    ({
      DRAFT: 'neutral',
      OPEN: 'success',
      CLOSED: 'warning',
      ARCHIVED: 'neutral',
    }) as const
  )[s]
export const formatJobDate = (v: string | null) =>
  v
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
        new Date(v),
      )
    : 'Not available'
export function jobError(error: unknown, fallback: string) {
  if (!isApiError(error)) return fallback
  if (error.status === 403)
    return 'You do not have permission to manage jobs in this workspace.'
  if (error.status === 404) return 'This job is no longer available.'
  if (error.code === 'JOB_VERSION_CONFLICT')
    return 'This job was updated by someone else. Reload the latest version before making further changes.'
  if (error.code === 'JOB_NOT_READY_TO_OPEN')
    return error.message || 'Complete the required job details before opening.'
  if (error.code === 'JOB_ARCHIVED') return 'Archived jobs are read-only.'
  if (error.status === 409)
    return (
      error.message || 'This action is not valid for the current job status.'
    )
  return fallback
}
export function validateJob(input: JobInput, opening = false) {
  const e: Record<string, string> = {}
  if (input.title.length > 160) e.title = 'Use 160 characters or fewer.'
  if ((input.department?.length ?? 0) > 100)
    e.department = 'Use 100 characters or fewer.'
  if ((input.location?.length ?? 0) > 160)
    e.location = 'Use 160 characters or fewer.'
  if ((input.description?.length ?? 0) > 50000)
    e.description = 'Use 50,000 characters or fewer.'
  if (
    !Number.isInteger(input.openings) ||
    (input.openings ?? 0) < 1 ||
    (input.openings ?? 0) > 1000
  )
    e.openings = 'Enter a whole number from 1 to 1,000.'
  if (opening) {
    if (!input.title.trim()) e.title = 'Enter a job title.'
    if (!input.employmentType) e.employmentType = 'Choose an employment type.'
    if (!input.workplaceType) e.workplaceType = 'Choose a workplace type.'
    if (!input.description?.trim())
      e.description = 'Add a job description before opening.'
    if (
      ['ONSITE', 'HYBRID'].includes(input.workplaceType ?? '') &&
      !input.location?.trim()
    )
      e.location = 'Add a location before opening this job.'
  }
  return e
}

export const can = (
  permissions: readonly string[] | undefined,
  permission: string,
) => permissions?.includes(permission) ?? false

export const jobTitle = (title: string) => title.trim() || 'Untitled job'
export const detailToInput = (j: JobDetailDto): JobInput => ({
  title: j.title,
  department: j.department,
  employmentType: j.employmentType ?? undefined,
  workplaceType: j.workplaceType ?? undefined,
  location: j.location,
  description: j.description,
  openings: j.openings,
})
