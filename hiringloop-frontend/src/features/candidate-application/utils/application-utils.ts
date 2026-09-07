import { isApiError } from '../../../shared/lib/apiErrors'
import { z } from 'zod'
import type {
  PublicApplicationQuestionDto,
  PublicApplicationQuestionType,
} from '../../public-careers/types/public-career.types'

export const MAX_RESUME_BYTES = 5 * 1024 * 1024
export const allowedResumeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

const allowedExtensions = ['.pdf', '.doc', '.docx'] as const

export type ApplicationAnswer = { questionId: string; value: unknown }
export type ApplicationFieldErrors = Record<string, string>

export type CandidateApplicationFormValues = {
  firstName: string
  lastName: string
  email: string
  phone: string
  answers: Record<string, unknown>
  resume: File | null
}

export function fileTypeAllowed(file: File) {
  const name = file.name.toLowerCase()
  if (file.type)
    return allowedResumeTypes.includes(
      file.type.toLowerCase() as (typeof allowedResumeTypes)[number],
    )
  return allowedExtensions.some((extension) => name.endsWith(extension))
}

export function validateResume(file: File | null): string | undefined {
  if (!file) return 'Please select a resume.'
  if (file.size <= 0) return 'The selected resume is empty.'
  if (file.size > MAX_RESUME_BYTES)
    return 'Your resume must be 5 MB or smaller.'
  if (!fileTypeAllowed(file)) return 'Upload a PDF, DOC, or DOCX resume.'
  return undefined
}

/** Builds validation from the exact question definitions served with this form version. */
export function candidateApplicationSchema(
  questions: readonly PublicApplicationQuestionDto[],
) {
  return z
    .object({
      firstName: z
        .string()
        .trim()
        .min(1, 'Enter your first name.')
        .max(100, 'First name must be 100 characters or fewer.'),
      lastName: z
        .string()
        .trim()
        .min(1, 'Enter your last name.')
        .max(100, 'Last name must be 100 characters or fewer.'),
      email: z
        .string()
        .trim()
        .min(1, 'Enter your email address.')
        .email('Enter a valid email address.')
        .max(320, 'Email must be 320 characters or fewer.'),
      phone: z.string().trim().max(50, 'Phone must be 50 characters or fewer.'),
      answers: z.record(z.string(), z.unknown()),
      resume: z.custom<File | null>(),
    })
    .superRefine((values, context) => {
      const resumeError = validateResume(values.resume)
      if (resumeError)
        context.addIssue({
          code: 'custom',
          message: resumeError,
          path: ['resume'],
        })

      for (const question of questions) {
        const value = values.answers[question.id]
        const empty =
          value === undefined ||
          value === null ||
          value === '' ||
          (Array.isArray(value) && value.length === 0)
        const path = ['answers', question.id]
        if (question.required && empty) {
          context.addIssue({
            code: 'custom',
            message: 'This question is required.',
            path,
          })
          continue
        }
        if (empty) continue
        if (question.type === 'NUMBER' && !Number.isFinite(Number(value)))
          context.addIssue({
            code: 'custom',
            message: 'Enter a valid number.',
            path,
          })
        if (question.type === 'URL') {
          try {
            const parsed = new URL(String(value))
            if (!['http:', 'https:'].includes(parsed.protocol))
              throw new Error()
          } catch {
            context.addIssue({
              code: 'custom',
              message: 'Enter a valid http or https URL.',
              path,
            })
          }
        }
        if (question.type === 'SHORT_TEXT' && String(value).trim().length > 500)
          context.addIssue({
            code: 'custom',
            message: 'Keep this answer to 500 characters or fewer.',
            path,
          })
        if (
          question.type === 'LONG_TEXT' &&
          String(value).trim().length > 10_000
        )
          context.addIssue({
            code: 'custom',
            message: 'Keep this answer to 10,000 characters or fewer.',
            path,
          })
      }
    })
}

export function readableFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function questionTypeLabel(type: PublicApplicationQuestionType) {
  return {
    SHORT_TEXT: 'Short answer',
    LONG_TEXT: 'Long answer',
    NUMBER: 'Number',
    YES_NO: 'Yes or no',
    SINGLE_SELECT: 'Single choice',
    MULTI_SELECT: 'Multiple choice',
    DATE: 'Date',
    URL: 'Website URL',
  }[type]
}

export function answerForSubmission(
  questions: readonly PublicApplicationQuestionDto[],
  values: Readonly<Record<string, unknown>>,
): ApplicationAnswer[] {
  return questions.flatMap((question): ApplicationAnswer[] => {
    const value = values[question.id]
    if (value === undefined || value === null || value === '') return []
    if (question.type === 'MULTI_SELECT') {
      const optionIds = Array.isArray(value)
        ? value.filter(Boolean).map(String)
        : []
      return optionIds.length
        ? [{ questionId: question.id, value: { optionIds } }]
        : []
    }
    if (question.type === 'SINGLE_SELECT')
      return [{ questionId: question.id, value: { optionId: String(value) } }]
    if (question.type === 'NUMBER') {
      const numberValue = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(numberValue)
        ? [{ questionId: question.id, value: numberValue }]
        : []
    }
    if (question.type === 'YES_NO')
      return [{ questionId: question.id, value: value === true }]
    return [{ questionId: question.id, value: String(value).trim() }]
  })
}

export function validateApplication(
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  file: File | null,
  questions: readonly PublicApplicationQuestionDto[],
  values: Readonly<Record<string, unknown>>,
) {
  const result = candidateApplicationSchema(questions).safeParse({
    firstName,
    lastName,
    email,
    phone,
    resume: file,
    answers: values,
  })
  const errors: ApplicationFieldErrors = {}
  if (result.success) return errors
  for (const issue of result.error.issues) {
    const [root, questionId] = issue.path
    const key =
      root === 'answers' ? `question-${String(questionId)}` : String(root)
    if (!errors[key]) errors[key] = issue.message
  }
  return errors
}

export function applicationErrorMessage(error: unknown) {
  if (!isApiError(error))
    return 'We could not submit your application. Please try again.'
  switch (error.code) {
    case 'APPLICATION_FORM_UNAVAILABLE':
      return 'This application form is currently unavailable.'
    case 'JOB_NOT_ACCEPTING_APPLICATIONS':
      return 'This job is no longer accepting applications.'
    case 'DUPLICATE_APPLICATION':
      return 'An application for this job has already been received.'
    case 'IDEMPOTENCY_CONFLICT':
      return 'This submission could not be safely retried. Please refresh the page and submit again.'
    case 'RATE_LIMITED':
      return 'Too many attempts. Please wait a little while and try again.'
    case 'FILE_TYPE_NOT_ALLOWED':
      return 'Upload a PDF, DOC, or DOCX resume.'
    case 'FILE_TOO_LARGE':
      return 'Your resume must be 5 MB or smaller.'
    case 'APPLICATION_STORAGE_UNAVAILABLE':
      return 'Resume storage is temporarily unavailable. Please try again later.'
    case 'APPLICATION_UPLOAD_EXPIRED':
    case 'APPLICATION_UPLOAD_ALREADY_CONSUMED':
    case 'INVALID_APPLICATION_UPLOAD':
      return 'The resume upload is no longer ready. Please try uploading it again.'
    case 'VALIDATION_ERROR':
    case 'INVALID_FORM_VERSION':
    case 'INVALID_APPLICATION_ANSWER':
    case 'REQUIRED_ANSWER_MISSING':
      return 'Please review the application details and try again.'
    default:
      return error.kind === 'network' || error.status === 503
        ? 'We could not reach the application service. Check your connection and try again.'
        : 'We could not submit your application. Please try again.'
  }
}

export function newIdempotencyKey() {
  return crypto.randomUUID()
}
