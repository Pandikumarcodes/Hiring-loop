export const ERROR_CODES = Object.freeze({
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  INTERNAL: 'INTERNAL_ERROR',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  EMAIL_DELIVERY_FAILED: 'EMAIL_DELIVERY_FAILED',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  CSRF_INVALID: 'CSRF_INVALID',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
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

export function authTokenInvalidError() {
  return new ApplicationError({
    status: 400,
    code: ERROR_CODES.AUTH_TOKEN_INVALID,
    message: 'The authentication token is invalid or no longer available',
  });
}

export function emailDeliveryFailedError({ operation = 'verification' } = {}) {
  return new ApplicationError({
    status: 503,
    code: ERROR_CODES.EMAIL_DELIVERY_FAILED,
    message:
      operation === 'invitation'
        ? 'Invitation email could not be sent'
        : 'Verification email could not be sent',
  });
}

export function authenticationFailedError() {
  return new ApplicationError({
    status: 401,
    code: ERROR_CODES.AUTHENTICATION_FAILED,
    message: 'Invalid email or password.',
  });
}

export function passwordChangeRejectedError() {
  return new ApplicationError({
    status: 400,
    code: ERROR_CODES.AUTHENTICATION_FAILED,
    message:
      'The current password is incorrect or the password change is not allowed.',
  });
}

export function unauthenticatedError() {
  return new ApplicationError({
    status: 401,
    code: ERROR_CODES.UNAUTHENTICATED,
    message: 'Authentication is required.',
  });
}

export function csrfInvalidError() {
  return new ApplicationError({
    status: 403,
    code: ERROR_CODES.CSRF_INVALID,
    message: 'A valid CSRF token is required.',
  });
}

export function forbiddenError(message = 'Forbidden.') {
  return new ApplicationError({
    status: 403,
    code: ERROR_CODES.FORBIDDEN,
    message,
  });
}

export function rateLimitError() {
  return new ApplicationError({
    status: 429,
    code: ERROR_CODES.RATE_LIMITED,
    message: 'Too many requests. Please try again later.',
  });
}
