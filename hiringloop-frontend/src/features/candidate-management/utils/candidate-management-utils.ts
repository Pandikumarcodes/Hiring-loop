import { isApiError } from '../../../shared/lib/apiErrors'
import type {
  ApplicationAnswerDto,
  ApplicationQuestionType,
  CandidateSort,
} from '../types/candidate-management.types'

export const canViewCandidates = (permissions?: readonly string[]) =>
  permissions?.includes('candidate:list') ?? false

export const canReadCandidates = (permissions?: readonly string[]) =>
  permissions?.includes('candidate:read') ?? false

export function candidateError(error: unknown, fallback: string) {
  if (!isApiError(error)) return fallback
  if (error.status === 403)
    return 'You do not have permission to view candidates in this workspace.'
  if (error.status === 404)
    return 'This candidate or application is no longer available.'
  return fallback
}

export function documentAccessError(error: unknown) {
  if (!isApiError(error))
    return 'We could not open this document. Please try again.'
  if (error.status === 403)
    return 'You do not have permission to access candidate documents.'
  if (error.status === 404) return 'This document is no longer available.'
  if (error.code === 'APPLICATION_STORAGE_UNAVAILABLE')
    return 'Resume storage is temporarily unavailable. Please try again later.'
  return 'We could not open this document. Please try again.'
}

export function formatCandidateDate(value: string | null | undefined) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function parseCandidateSort(value: string | null): CandidateSort {
  return (
    ['newestApplication', 'oldestApplication', 'nameAsc', 'nameDesc'].includes(
      value ?? '',
    )
      ? value
      : 'newestApplication'
  ) as CandidateSort
}

export function formatAnswer(answer: ApplicationAnswerDto) {
  const { type } = answer.question
  if (type === 'SINGLE_SELECT' || type === 'MULTI_SELECT') {
    return answer.selectedOptions.length
      ? answer.selectedOptions.map((option) => option.label).join(', ')
      : 'No selection'
  }
  return formatAnswerValue(type, answer.value)
}

function formatAnswerValue(type: ApplicationQuestionType, value: unknown) {
  if (value === null || value === undefined || value === '')
    return 'Not provided'
  if (type === 'YES_NO')
    return value === true ? 'Yes' : value === false ? 'No' : String(value)
  if (typeof value === 'string' || typeof value === 'number')
    return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  try {
    return JSON.stringify(value)
  } catch {
    return 'Provided'
  }
}

export function safeHttpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : undefined
  } catch {
    return undefined
  }
}
