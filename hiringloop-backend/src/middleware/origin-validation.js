import { forbiddenError } from '../errors/application-error.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function isAllowedOrigin(origin, allowedOrigin) {
  return (
    typeof origin === 'string' &&
    typeof allowedOrigin === 'string' &&
    origin === allowedOrigin
  );
}

export function createOriginValidationMiddleware({
  allowedOrigin,
  requireOrigin = false,
}) {
  return function validateBrowserOrigin(request, _response, next) {
    if (!UNSAFE_METHODS.has(request.method)) return next();
    const origin = request.headers.origin;
    if (origin === undefined && !requireOrigin) return next();
    if (!isAllowedOrigin(origin, allowedOrigin)) {
      return next(forbiddenError('Request origin is not allowed.'));
    }
    return next();
  };
}
