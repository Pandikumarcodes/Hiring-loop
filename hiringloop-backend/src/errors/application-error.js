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
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  JOB_VERSION_CONFLICT: 'JOB_VERSION_CONFLICT',
  JOB_INVALID_TRANSITION: 'JOB_INVALID_TRANSITION',
  JOB_NOT_READY_TO_OPEN: 'JOB_NOT_READY_TO_OPEN',
  JOB_ARCHIVED: 'JOB_ARCHIVED',
  PIPELINE_NOT_FOUND: 'PIPELINE_NOT_FOUND',
  PIPELINE_STAGE_NOT_FOUND: 'PIPELINE_STAGE_NOT_FOUND',
  PIPELINE_VERSION_CONFLICT: 'PIPELINE_VERSION_CONFLICT',
  PIPELINE_JOB_LOCKED: 'PIPELINE_JOB_LOCKED',
  PIPELINE_DUPLICATE_STAGE_NAME: 'PIPELINE_DUPLICATE_STAGE_NAME',
  PIPELINE_STAGE_LIMIT_REACHED: 'PIPELINE_STAGE_LIMIT_REACHED',
  PIPELINE_ENTRY_DELETE_FORBIDDEN: 'PIPELINE_ENTRY_DELETE_FORBIDDEN',
  PIPELINE_ENTRY_MOVE_FORBIDDEN: 'PIPELINE_ENTRY_MOVE_FORBIDDEN',
  PIPELINE_INVALID_STAGE_ORDER: 'PIPELINE_INVALID_STAGE_ORDER',
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

function jobError({ code, message, details }) {
  return new ApplicationError({
    status: code === ERROR_CODES.JOB_NOT_FOUND ? 404 : 409,
    code,
    message,
    details,
  });
}

export const jobNotFoundError = () =>
  jobError({ code: ERROR_CODES.JOB_NOT_FOUND, message: 'Job not found' });
export const jobVersionConflictError = () =>
  jobError({
    code: ERROR_CODES.JOB_VERSION_CONFLICT,
    message: 'Job version is stale',
  });
export const jobInvalidTransitionError = (details) =>
  jobError({
    code: ERROR_CODES.JOB_INVALID_TRANSITION,
    message: 'Job lifecycle transition is not allowed',
    details,
  });
export const jobNotReadyToOpenError = (details) =>
  jobError({
    code: ERROR_CODES.JOB_NOT_READY_TO_OPEN,
    message: 'Job is not ready to open',
    details,
  });
export const jobArchivedError = () =>
  jobError({
    code: ERROR_CODES.JOB_ARCHIVED,
    message: 'Archived jobs are read-only',
  });

function pipelineError({ code, message, details, status = 409 }) {
  return new ApplicationError({ status, code, message, details });
}
export const pipelineNotFoundError = () =>
  pipelineError({
    status: 404,
    code: ERROR_CODES.PIPELINE_NOT_FOUND,
    message: 'Pipeline not found',
  });
export const pipelineStageNotFoundError = () =>
  pipelineError({
    status: 404,
    code: ERROR_CODES.PIPELINE_STAGE_NOT_FOUND,
    message: 'Pipeline stage not found',
  });
export const pipelineVersionConflictError = () =>
  pipelineError({
    code: ERROR_CODES.PIPELINE_VERSION_CONFLICT,
    message: 'Pipeline version is stale',
  });
export const pipelineJobLockedError = (details) =>
  pipelineError({
    code: ERROR_CODES.PIPELINE_JOB_LOCKED,
    message:
      'Pipeline configuration is unavailable for this job lifecycle state',
    details,
  });
export const pipelineDuplicateNameError = () =>
  pipelineError({
    code: ERROR_CODES.PIPELINE_DUPLICATE_STAGE_NAME,
    message: 'A stage with this name already exists',
  });
export const pipelineStageLimitError = () =>
  pipelineError({
    code: ERROR_CODES.PIPELINE_STAGE_LIMIT_REACHED,
    message: 'A pipeline cannot contain more than 20 stages',
  });
export const pipelineEntryDeleteError = () =>
  pipelineError({
    code: ERROR_CODES.PIPELINE_ENTRY_DELETE_FORBIDDEN,
    message: 'The entry stage cannot be deleted',
  });
export const pipelineEntryMoveError = () =>
  pipelineError({
    code: ERROR_CODES.PIPELINE_ENTRY_MOVE_FORBIDDEN,
    message: 'The entry stage must remain first',
  });
export const pipelineInvalidOrderError = () =>
  pipelineError({
    status: 400,
    code: ERROR_CODES.PIPELINE_INVALID_STAGE_ORDER,
    message: 'Stage order must contain every pipeline stage exactly once',
  });
