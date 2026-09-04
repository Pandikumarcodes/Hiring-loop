import {
  forbiddenError,
  unauthenticatedError,
} from '../errors/application-error.js';
import { hasPermission } from '../authorization/permissions.js';

export function requirePermission(permission) {
  return function permissionMiddleware(request, _response, next) {
    if (!request.auth?.userId) {
      next(unauthenticatedError());
      return;
    }

    const tenantContext = request.tenantContext;
    if (
      !tenantContext ||
      typeof tenantContext !== 'object' ||
      typeof tenantContext.organizationId !== 'string' ||
      typeof tenantContext.membershipId !== 'string' ||
      typeof tenantContext.role !== 'string'
    ) {
      next(forbiddenError());
      return;
    }

    if (!hasPermission({ role: tenantContext.role, permission })) {
      next(forbiddenError());
      return;
    }

    next();
  };
}
