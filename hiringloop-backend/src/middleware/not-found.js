import { notFoundError } from '../errors/application-error.js';

export function notFoundMiddleware(request, _response, next) {
  next(notFoundError('Route not found'));
}
