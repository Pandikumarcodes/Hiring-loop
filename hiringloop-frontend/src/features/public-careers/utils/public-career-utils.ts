import { isApiError } from '../../../shared/lib/apiErrors'
import type { EmploymentType, WorkplaceType } from '../../jobs/types/job.types'

export const PUBLIC_CAREER_PAGE_SIZE = 20

export const employmentLabel = (value: EmploymentType | null) =>
  value
    ? {
        FULL_TIME: 'Full time',
        PART_TIME: 'Part time',
        CONTRACT: 'Contract',
        TEMPORARY: 'Temporary',
        INTERNSHIP: 'Internship',
        OTHER: 'Other',
      }[value]
    : null

export const workplaceLabel = (value: WorkplaceType | null) =>
  value
    ? { ONSITE: 'On-site', HYBRID: 'Hybrid', REMOTE: 'Remote' }[value]
    : null

export const isUnavailable = (error: unknown) =>
  isApiError(error) && error.status === 404

export function publicWebsiteHref(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : null
  } catch {
    return null
  }
}

export function setCareerMetadata(title: string, description: string) {
  const previousTitle = document.title
  const existingMeta = document.querySelector('meta[name="description"]')
  const previousDescription = existingMeta
    ? existingMeta.getAttribute('content')
    : null
  document.title = title
  let meta = existingMeta
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'description')
    document.head.append(meta)
  }
  meta.setAttribute('content', description)
  return () => {
    document.title = previousTitle
    if (existingMeta) {
      if (previousDescription === null) existingMeta.removeAttribute('content')
      else existingMeta.setAttribute('content', previousDescription)
    } else meta.remove()
  }
}
