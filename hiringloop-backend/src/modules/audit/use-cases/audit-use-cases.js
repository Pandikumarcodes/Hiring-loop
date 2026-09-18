import { ApplicationError } from '../../../errors/application-error.js';
import { toAuditEventDto } from '../domain/audit-dto.js';
export function createAuditUseCases({ repository }) {
  return {
    async list(input) {
      const result = await repository.list(input);
      return {
        auditEvents: result.rows.map(toAuditEventDto),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          totalItems: result.totalItems,
          totalPages: Math.ceil(result.totalItems / input.pageSize),
        },
      };
    },
    async get(input) {
      const row = await repository.find(input);
      if (!row)
        throw new ApplicationError({
          status: 404,
          code: 'AUDIT_EVENT_NOT_FOUND',
          message: 'Audit event not found',
        });
      return toAuditEventDto(row);
    },
  };
}
