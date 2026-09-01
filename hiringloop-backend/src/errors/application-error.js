export const ERROR_CODES = Object.freeze({
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  INTERNAL: 'INTERNAL_ERROR',
});

export class ApplicationError extends Error {
  constructor({ status, code, message, details }) {
    super(message);
    this.name = 'ApplicationError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function validationError(
  message = 'Request validation failed',
  details,
) {
  return new ApplicationError({
    status: 400,
    code: ERROR_CODES.VALIDATION,
    message,
    details,
  });
}

export function notFoundError(message = 'Resource not found', details) {
  return new ApplicationError({
    status: 404,
    code: ERROR_CODES.NOT_FOUND,
    message,
    details,
  });
}

export function conflictError(message = 'Resource conflict', details) {
  return new ApplicationError({
    status: 409,
    code: ERROR_CODES.CONFLICT,
    message,
    details,
  });
}
