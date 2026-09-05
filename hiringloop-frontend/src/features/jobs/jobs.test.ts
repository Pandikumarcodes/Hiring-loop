import { describe, expect, test } from 'vitest'
import { jobKeys } from './hooks/query-keys'
import type { JobFilters } from './types/job.types'
import { validateJob } from './utils/job-utils'

const filters: JobFilters = {
  page: 1,
  limit: 20,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
}

describe('job frontend contracts', () => {
  test('isolates every tenant query key by organization', () => {
    expect(jobKeys.list('organization-a', filters)).not.toEqual(
      jobKeys.list('organization-b', filters),
    )
    expect(jobKeys.detail('organization-a', 'job-1')).not.toEqual(
      jobKeys.detail('organization-b', 'job-1'),
    )
  })

  test('allows incomplete drafts but reports opening readiness fields', () => {
    const draft = { title: 'Product Designer', openings: 1 } as const
    expect(validateJob(draft)).toEqual({})
    expect(validateJob(draft, true)).toEqual({
      employmentType: 'Choose an employment type.',
      workplaceType: 'Choose a workplace type.',
      description: 'Add a job description before opening.',
    })
  })

  test('allows an untitled Draft but requires its title before opening', () => {
    const draft = { title: '', openings: 1 } as const
    expect(validateJob(draft)).toEqual({})
    expect(validateJob(draft, true).title).toBe('Enter a job title.')
  })

  test('requires location for hybrid opening but not remote opening', () => {
    const ready = {
      title: 'Engineer',
      openings: 1,
      employmentType: 'FULL_TIME' as const,
      description: 'Build the product.',
    }
    expect(
      validateJob({ ...ready, workplaceType: 'HYBRID' }, true).location,
    ).toBe('Add a location before opening this job.')
    expect(validateJob({ ...ready, workplaceType: 'REMOTE' }, true)).toEqual({})
  })
})
