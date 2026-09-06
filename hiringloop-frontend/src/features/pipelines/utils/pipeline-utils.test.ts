import { describe, expect, test } from 'vitest'
import { ApiError } from '../../../shared/lib/apiErrors'
import {
  canConfigurePipeline,
  pipelineEditableForJob,
  pipelineError,
  validateStageName,
} from './pipeline-utils'

describe('Pipeline UI rules', () => {
  test('centralizes configuration capability and lifecycle read-only rules', () => {
    expect(canConfigurePipeline(['pipeline:view', 'pipeline:configure'])).toBe(
      true,
    )
    expect(canConfigurePipeline(['pipeline:view'])).toBe(false)
    expect(pipelineEditableForJob('DRAFT')).toBe(true)
    expect(pipelineEditableForJob('OPEN')).toBe(true)
    expect(pipelineEditableForJob('CLOSED')).toBe(false)
    expect(pipelineEditableForJob('ARCHIVED')).toBe(false)
  })
  test('maps conflicts and validates user-facing stage names', () => {
    expect(
      pipelineError(
        new ApiError({
          kind: 'http',
          status: 409,
          code: 'PIPELINE_VERSION_CONFLICT',
          message: 'stale',
        }),
      ),
    ).toContain('changed since you opened')
    expect(validateStageName(' ')).toBe('Enter a stage name.')
    expect(validateStageName('x'.repeat(81))).toBe(
      'Use 80 characters or fewer.',
    )
    expect(validateStageName(' Screening ')).toBeUndefined()
  })
})
