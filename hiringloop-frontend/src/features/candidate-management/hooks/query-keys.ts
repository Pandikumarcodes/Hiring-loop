import type { CandidateListFilters } from '../types/candidate-management.types'

export const candidateKeys = {
  all: (organizationId: string) => ['candidates', organizationId] as const,
  lists: (organizationId: string) =>
    [...candidateKeys.all(organizationId), 'list'] as const,
  list: (organizationId: string, filters: CandidateListFilters) =>
    [...candidateKeys.lists(organizationId), filters] as const,
  details: (organizationId: string) =>
    [...candidateKeys.all(organizationId), 'detail'] as const,
  detail: (organizationId: string, candidateId: string) =>
    [...candidateKeys.details(organizationId), candidateId] as const,
  applications: (organizationId: string) =>
    [...candidateKeys.all(organizationId), 'application'] as const,
  application: (organizationId: string, applicationId: string) =>
    [...candidateKeys.applications(organizationId), applicationId] as const,
}
