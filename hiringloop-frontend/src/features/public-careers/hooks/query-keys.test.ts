import { describe, expect, test } from 'vitest'
import { publicCareerKeys } from './query-keys'
describe('public career query keys', () => {
  test('separates public identity by slug, job, page and pageSize', () => {
    expect(publicCareerKeys.jobs('acme', 1, 20)).toEqual([
      'public-careers',
      'acme',
      'jobs',
      { page: 1, pageSize: 20 },
    ])
    expect(publicCareerKeys.jobs('other', 1, 20)).not.toEqual(
      publicCareerKeys.jobs('acme', 1, 20),
    )
    expect(publicCareerKeys.jobs('acme', 2, 20)).not.toEqual(
      publicCareerKeys.jobs('acme', 1, 20),
    )
    expect(publicCareerKeys.jobs('acme', 1, 100)).not.toEqual(
      publicCareerKeys.jobs('acme', 1, 20),
    )
    expect(publicCareerKeys.job('acme', 'one')).not.toEqual(
      publicCareerKeys.job('acme', 'two'),
    )
    expect(publicCareerKeys.applicationForm('acme', 'one')).not.toEqual(
      publicCareerKeys.applicationForm('acme', 'two'),
    )
  })
})
