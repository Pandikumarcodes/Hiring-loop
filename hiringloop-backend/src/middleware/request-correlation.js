import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'X-Request-Id';

/**
 * Assign a server-owned ephemeral identifier to every request.
 * Client-provided identifiers are intentionally ignored.
 */
export function requestCorrelationMiddleware(request, response, next) {
  const requestId = randomUUID();
  request.requestId = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
