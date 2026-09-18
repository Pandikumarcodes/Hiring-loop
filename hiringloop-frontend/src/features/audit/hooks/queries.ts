import { useQuery } from '@tanstack/react-query'
import { getAuditEvent, listAuditEvents } from '../api/audit.api'
import type { AuditFilters } from '../types/audit.types'
import { auditKeys } from './query-keys'

const options = { meta: { clearOnAuthChange: true }, staleTime: 60_000 }

export function useAuditEvents(
  o: string,
  filters: AuditFilters,
  page = 1,
  pageSize = 25,
  enabled = true,
) {
  return useQuery({
    ...options,
    queryKey: auditKeys.list(o, filters, page, pageSize),
    queryFn: ({ signal }) =>
      listAuditEvents(o, filters, page, pageSize, signal),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export function useAuditEvent(o: string, id: string, enabled = true) {
  return useQuery({
    ...options,
    queryKey: auditKeys.detail(o, id),
    queryFn: ({ signal }) => getAuditEvent(o, id, signal),
    enabled,
  })
}
