import {
  ApplicationError,
  ERROR_CODES,
  validationError,
} from '../errors/application-error.js';

const INTERNAL_MESSAGE = 'An unexpected error occurred';
const MALFORMED_JSON_MESSAGE = 'Request body contains malformed JSON';

function safeDetails(value, depth = 0) {
  if (depth > 4 || value === undefined) return undefined;
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return value;
  }
  if (typeof value === 'string') return value.slice(0, 500);
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => safeDetails(item, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 20)
        .map(([key, item]) => [
          key.slice(0, 100),
          safeDetails(item, depth + 1),
        ]),
    );
  }
  return undefined;
}

function isMalformedJsonError(error) {
  return error?.type === 'entity.parse.failed' && error?.status === 400;
}

function isPayloadTooLargeError(error) {
  return error?.type === 'entity.too.large' && error?.status === 413;
}

function errorResponse(error, request) {
  const response = {
    code: ERROR_CODES.INTERNAL,
    message: INTERNAL_MESSAGE,
    requestId: request.requestId ?? null,
  };

  if (error instanceof ApplicationError) {
    response.code = error.code;
    response.message = error.message;
    const details = safeDetails(error.details);
    if (details !== undefined) response.details = details;
    return response;
  }

  if (isMalformedJsonError(error)) {
    const malformedJson = validationError(MALFORMED_JSON_MESSAGE);
    response.code = malformedJson.code;
    response.message = malformedJson.message;
    return response;
  }

  if (isPayloadTooLargeError(error)) {
    response.code = ERROR_CODES.PAYLOAD_TOO_LARGE;
    response.message = 'Request body is too large';
    return response;
  }

  return response;
}

export function errorHandler(error, request, response, _next) {
  if (
    !(error instanceof ApplicationError) &&
    !isMalformedJsonError(error) &&
    !isPayloadTooLargeError(error)
  ) {
    console.error('Unhandled request error', {
      name: error?.name ?? 'Error',
      requestId: request.requestId ?? null,
    });
  }

  const body = { error: errorResponse(error, request) };
  const status =
    error instanceof ApplicationError && Number.isInteger(error.status)
      ? error.status
      : isMalformedJsonError(error)
        ? 400
        : isPayloadTooLargeError(error)
          ? 413
          : 500;

  response.status(status).json(body);
}
