import { queryOptions, useQuery } from '@tanstack/react-query'
import {
  getApplication,
  getCandidate,
  listCandidates,
} from '../api/candidate-management.api'
import type { CandidateListFilters } from '../types/candidate-management.types'
import { candidateKeys } from './query-keys'

export function candidatesQueryOptions(
  organizationId: string,
  filters: CandidateListFilters,
  enabled = true,
) {
  return queryOptions({
    queryKey: candidateKeys.list(organizationId, filters),
    queryFn: ({ signal }) => listCandidates(organizationId, filters, signal),
    enabled,
    placeholderData: (old) => old,
    meta: { clearOnAuthChange: true },
  })
}

export function candidateQueryOptions(
  organizationId: string,
  candidateId: string,
  enabled = true,
) {
  return queryOptions({
    queryKey: candidateKeys.detail(organizationId, candidateId),
    queryFn: ({ signal }) => getCandidate(organizationId, candidateId, signal),
    enabled,
    meta: { clearOnAuthChange: true },
  })
}

export function applicationQueryOptions(
  organizationId: string,
  applicationId: string,
  enabled = true,
) {
  return queryOptions({
    queryKey: candidateKeys.application(organizationId, applicationId),
    queryFn: ({ signal }) =>
      getApplication(organizationId, applicationId, signal),
    enabled,
    meta: { clearOnAuthChange: true },
  })
}

export const useCandidates = (
  organizationId: string,
  filters: CandidateListFilters,
  enabled = true,
) => useQuery(candidatesQueryOptions(organizationId, filters, enabled))

export const useCandidate = (
  organizationId: string,
  candidateId: string,
  enabled = true,
) => useQuery(candidateQueryOptions(organizationId, candidateId, enabled))

export const useApplication = (
  organizationId: string,
  applicationId: string,
  enabled = true,
) => useQuery(applicationQueryOptions(organizationId, applicationId, enabled))
