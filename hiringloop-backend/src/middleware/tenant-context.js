import {
  unauthenticatedError,
  validationError,
} from '../errors/application-error.js';

export function createTenantContextMiddleware({
  resolveTenantContext,
  organizationIdParam = 'organizationId',
}) {
  return async function tenantContext(request, _response, next) {
    const userId = request.auth?.userId;
    if (!userId) {
      next(unauthenticatedError());
      return;
    }

    const organizationId =
      request.validated?.params?.[organizationIdParam] ??
      request.params?.[organizationIdParam];
    if (typeof organizationId !== 'string' || !isUuid(organizationId)) {
      next(validationError());
      return;
    }

    try {
      request.tenantContext = await resolveTenantContext({
        userId,
        organizationId,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
