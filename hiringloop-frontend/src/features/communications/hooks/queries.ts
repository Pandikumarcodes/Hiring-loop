import { queryOptions, useQuery } from '@tanstack/react-query'
import { listCommunications, listTemplates } from '../api/communications.api'
import { communicationKeys } from './query-keys'
export const communicationsQueryOptions = (
  organizationId: string,
  applicationId: string,
  page: number,
  enabled = true,
) =>
  queryOptions({
    queryKey: communicationKeys.history(organizationId, applicationId, page),
    queryFn: ({ signal }) =>
      listCommunications(organizationId, applicationId, page, signal),
    enabled,
    meta: { clearOnAuthChange: true },
  })
export const templatesQueryOptions = (organizationId: string, enabled = true) =>
  queryOptions({
    queryKey: communicationKeys.templates(organizationId),
    queryFn: ({ signal }) => listTemplates(organizationId, signal),
    enabled,
    meta: { clearOnAuthChange: true },
  })
export const useCommunications = (
  organizationId: string,
  applicationId: string,
  page: number,
  enabled = true,
) =>
  useQuery(
    communicationsQueryOptions(organizationId, applicationId, page, enabled),
  )
export const useCommunicationTemplates = (
  organizationId: string,
  enabled = true,
) => useQuery(templatesQueryOptions(organizationId, enabled))
