import { isApiError } from '../../../shared/lib/apiErrors'
import type { ApplicationFormQuestionType } from '../types/application-form.types'
export const questionTypeLabels: Record<ApplicationFormQuestionType, string> = {
  SHORT_TEXT: 'Short answer',
  LONG_TEXT: 'Long answer',
  NUMBER: 'Number',
  YES_NO: 'Yes / No',
  SINGLE_SELECT: 'Single choice',
  MULTI_SELECT: 'Multiple choice',
  DATE: 'Date',
  URL: 'URL',
}
export const isChoice = (type: ApplicationFormQuestionType) =>
  type === 'SINGLE_SELECT' || type === 'MULTI_SELECT'
export const canViewApplicationForm = (permissions?: readonly string[]) =>
  permissions?.includes('application-form:view') ?? false
export const canConfigureApplicationForm = (permissions?: readonly string[]) =>
  permissions?.includes('application-form:configure') ?? false
export function applicationFormError(
  error: unknown,
  fallback = 'We could not update this application form.',
) {
  if (!isApiError(error)) return fallback
  if (error.code === 'FORM_VERSION_CONFLICT')
    return 'This form was changed by another team member. Reload the latest version before continuing.'
  if (error.code === 'APPLICATION_FORM_QUESTION_LIMIT_REACHED')
    return 'This form has reached the maximum of 100 custom questions.'
  if (error.code === 'APPLICATION_FORM_DRAFT_NOT_FOUND')
    return 'The draft is no longer available. Refresh the current form state.'
  if (error.code === 'APPLICATION_FORM_INVALID_ORDER')
    return 'The question order is no longer valid. Reload and try again.'
  if (error.code === 'VALIDATION_ERROR')
    return 'Please review the question details and try again.'
  if (error.status === 403 || error.status === 404)
    return 'This application form is no longer available to you.'
  return fallback
}
