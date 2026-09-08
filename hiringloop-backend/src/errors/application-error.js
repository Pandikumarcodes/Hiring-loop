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
  APPLICATION_FORM_NOT_FOUND: 'APPLICATION_FORM_NOT_FOUND',
  APPLICATION_FORM_QUESTION_NOT_FOUND: 'APPLICATION_FORM_QUESTION_NOT_FOUND',
  FORM_VERSION_CONFLICT: 'FORM_VERSION_CONFLICT',
  APPLICATION_FORM_INVALID_ORDER: 'APPLICATION_FORM_INVALID_ORDER',
  APPLICATION_FORM_DRAFT_NOT_FOUND: 'APPLICATION_FORM_DRAFT_NOT_FOUND',
  APPLICATION_FORM_QUESTION_LIMIT_REACHED:
    'APPLICATION_FORM_QUESTION_LIMIT_REACHED',
  APPLICATION_FORM_UNAVAILABLE: 'APPLICATION_FORM_UNAVAILABLE',
  JOB_NOT_ACCEPTING_APPLICATIONS: 'JOB_NOT_ACCEPTING_APPLICATIONS',
  INVALID_FORM_VERSION: 'INVALID_FORM_VERSION',
  INVALID_APPLICATION_ANSWER: 'INVALID_APPLICATION_ANSWER',
  REQUIRED_ANSWER_MISSING: 'REQUIRED_ANSWER_MISSING',
  INVALID_APPLICATION_UPLOAD: 'INVALID_APPLICATION_UPLOAD',
  APPLICATION_UPLOAD_EXPIRED: 'APPLICATION_UPLOAD_EXPIRED',
  APPLICATION_UPLOAD_ALREADY_CONSUMED: 'APPLICATION_UPLOAD_ALREADY_CONSUMED',
  DUPLICATE_APPLICATION: 'DUPLICATE_APPLICATION',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  FILE_TYPE_NOT_ALLOWED: 'FILE_TYPE_NOT_ALLOWED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  APPLICATION_STORAGE_UNAVAILABLE: 'APPLICATION_STORAGE_UNAVAILABLE',
  INITIAL_PIPELINE_STAGE_UNAVAILABLE: 'INITIAL_PIPELINE_STAGE_UNAVAILABLE',
  INTERVIEW_NOT_FOUND: 'INTERVIEW_NOT_FOUND',
  INTERVIEW_SCHEDULE_CONFLICT: 'INTERVIEW_SCHEDULE_CONFLICT',
  INTERVIEW_ALREADY_CANCELLED: 'INTERVIEW_ALREADY_CANCELLED',
  INTERVIEW_CANNOT_RESCHEDULE: 'INTERVIEW_CANNOT_RESCHEDULE',
  INTERVIEW_CANNOT_UPDATE: 'INTERVIEW_CANNOT_UPDATE',
  INVALID_INTERVIEW_PARTICIPANT: 'INVALID_INTERVIEW_PARTICIPANT',
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

function formError({ code, message, status = 409 }) {
  return new ApplicationError({ status, code, message });
}
export const applicationFormNotFoundError = () =>
  formError({
    status: 404,
    code: ERROR_CODES.APPLICATION_FORM_NOT_FOUND,
    message: 'Application form not found',
  });
export const applicationFormDraftNotFoundError = () =>
  formError({
    status: 404,
    code: ERROR_CODES.APPLICATION_FORM_DRAFT_NOT_FOUND,
    message: 'Application form draft not found',
  });
export const applicationFormQuestionNotFoundError = () =>
  formError({
    status: 404,
    code: ERROR_CODES.APPLICATION_FORM_QUESTION_NOT_FOUND,
    message: 'Application form question not found',
  });
export const formVersionConflictError = () =>
  formError({
    code: ERROR_CODES.FORM_VERSION_CONFLICT,
    message: 'Application form draft revision is stale',
  });
export const applicationFormInvalidOrderError = () =>
  formError({
    status: 400,
    code: ERROR_CODES.APPLICATION_FORM_INVALID_ORDER,
    message: 'Question order must contain every draft question exactly once',
  });
export const applicationFormQuestionLimitError = () =>
  formError({
    status: 400,
    code: ERROR_CODES.APPLICATION_FORM_QUESTION_LIMIT_REACHED,
    message: 'An application form cannot contain more than 100 questions',
  });

function publicApplicationError({ code, message, status = 409 }) {
  return new ApplicationError({ status, code, message });
}
export const applicationFormUnavailableError = () =>
  publicApplicationError({
    status: 404,
    code: ERROR_CODES.APPLICATION_FORM_UNAVAILABLE,
    message: 'Application form is unavailable',
  });
export const jobNotAcceptingApplicationsError = () =>
  publicApplicationError({
    status: 409,
    code: ERROR_CODES.JOB_NOT_ACCEPTING_APPLICATIONS,
    message: 'This job is not accepting applications',
  });
export const invalidFormVersionError = () =>
  publicApplicationError({
    status: 400,
    code: ERROR_CODES.INVALID_FORM_VERSION,
    message: 'The application form version is invalid',
  });
export const invalidApplicationAnswerError = () =>
  publicApplicationError({
    status: 400,
    code: ERROR_CODES.INVALID_APPLICATION_ANSWER,
    message: 'An application answer is invalid',
  });
export const requiredAnswerMissingError = () =>
  publicApplicationError({
    status: 400,
    code: ERROR_CODES.REQUIRED_ANSWER_MISSING,
    message: 'A required application answer is missing',
  });
export const invalidApplicationUploadError = () =>
  publicApplicationError({
    status: 400,
    code: ERROR_CODES.INVALID_APPLICATION_UPLOAD,
    message: 'The resume upload is invalid',
  });
export const applicationUploadExpiredError = () =>
  publicApplicationError({
    status: 409,
    code: ERROR_CODES.APPLICATION_UPLOAD_EXPIRED,
    message: 'The resume upload has expired',
  });
export const applicationUploadAlreadyConsumedError = () =>
  publicApplicationError({
    status: 409,
    code: ERROR_CODES.APPLICATION_UPLOAD_ALREADY_CONSUMED,
    message: 'The resume upload has already been used',
  });
export const duplicateApplicationError = () =>
  publicApplicationError({
    status: 409,
    code: ERROR_CODES.DUPLICATE_APPLICATION,
    message: 'An application for this job already exists',
  });
export const idempotencyConflictError = () =>
  publicApplicationError({
    status: 409,
    code: ERROR_CODES.IDEMPOTENCY_CONFLICT,
    message: 'The idempotency key was reused with a different submission',
  });
export const fileTypeNotAllowedError = () =>
  publicApplicationError({
    status: 400,
    code: ERROR_CODES.FILE_TYPE_NOT_ALLOWED,
    message: 'The resume file type is not allowed',
  });
export const fileTooLargeError = () =>
  publicApplicationError({
    status: 400,
    code: ERROR_CODES.FILE_TOO_LARGE,
    message: 'The resume file is too large',
  });
export const applicationStorageUnavailableError = () =>
  publicApplicationError({
    status: 503,
    code: ERROR_CODES.APPLICATION_STORAGE_UNAVAILABLE,
    message: 'Resume storage is temporarily unavailable',
  });
export const initialPipelineStageUnavailableError = () =>
  publicApplicationError({
    status: 409,
    code: ERROR_CODES.INITIAL_PIPELINE_STAGE_UNAVAILABLE,
    message: 'This job cannot accept applications at this time',
  });

function interviewError({ code, message, details, status = 409 }) {
  return new ApplicationError({ status, code, message, details });
}

export const interviewNotFoundError = () =>
  interviewError({
    status: 404,
    code: ERROR_CODES.INTERVIEW_NOT_FOUND,
    message: 'Interview not found',
  });
export const interviewScheduleConflictError = (details) =>
  interviewError({
    code: ERROR_CODES.INTERVIEW_SCHEDULE_CONFLICT,
    message: 'An assigned participant has an overlapping scheduled interview',
    details,
  });
export const interviewAlreadyCancelledError = () =>
  interviewError({
    code: ERROR_CODES.INTERVIEW_ALREADY_CANCELLED,
    message: 'Interview is already cancelled',
  });
export const interviewCannotRescheduleError = () =>
  interviewError({
    code: ERROR_CODES.INTERVIEW_CANNOT_RESCHEDULE,
    message: 'Cancelled interviews cannot be rescheduled',
  });
export const interviewCannotUpdateError = () =>
  interviewError({
    code: ERROR_CODES.INTERVIEW_CANNOT_UPDATE,
    message: 'Cancelled interviews cannot be updated',
  });
export const invalidInterviewParticipantError = (details) =>
  interviewError({
    status: 400,
    code: ERROR_CODES.INVALID_INTERVIEW_PARTICIPANT,
    message:
      'One or more interview participants are not valid organization members',
    details,
  });
