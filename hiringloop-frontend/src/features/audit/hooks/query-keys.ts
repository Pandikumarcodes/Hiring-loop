import type { AuditFilters } from '../types/audit.types'

export const auditKeys = {
  all: (organizationId: string) => ['audit', organizationId] as const,
  list: (
    organizationId: string,
    filters: AuditFilters,
    page: number,
    pageSize: number,
  ) =>
    [
      ...auditKeys.all(organizationId),
      'list',
      filters,
      { page, pageSize },
    ] as const,
  detail: (organizationId: string, auditEventId: string) =>
    [...auditKeys.all(organizationId), 'detail', auditEventId] as const,
}
