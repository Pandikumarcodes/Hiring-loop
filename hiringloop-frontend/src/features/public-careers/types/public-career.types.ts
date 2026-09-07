import type { EmploymentType, WorkplaceType } from '../../jobs/types/job.types'

export interface PublicOrganizationDto {
  readonly name: string
  readonly slug: string
  readonly website: string | null
  readonly description: string | null
}

export interface PublicJobSummaryDto {
  readonly id: string
  readonly title: string
  readonly employmentType: EmploymentType | null
  readonly workplaceType: WorkplaceType | null
  readonly location: string | null
  readonly openings: number
  readonly openedAt: string | null
}

export interface PublicJobDetailDto extends PublicJobSummaryDto {
  readonly description: string | null
}

export interface PublicCareerPage {
  readonly organization: PublicOrganizationDto
  readonly jobs: readonly PublicJobSummaryDto[]
  readonly pagination: {
    readonly page: number
    readonly pageSize: number
    readonly totalItems: number
    readonly totalPages: number
  }
}

export interface PublicCareerJob {
  readonly organization: PublicOrganizationDto
  readonly job: PublicJobDetailDto
}

export type PublicApplicationQuestionType =
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'NUMBER'
  | 'YES_NO'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'DATE'
  | 'URL'

export interface PublicApplicationOptionDto {
  readonly id: string
  readonly label: string
  readonly value: string
}

export interface PublicApplicationQuestionDto {
  readonly id: string
  readonly type: PublicApplicationQuestionType
  readonly label: string
  readonly description: string | null
  readonly placeholder: string | null
  readonly required: boolean
  readonly options: readonly PublicApplicationOptionDto[]
}

export interface PublicApplicationFormDto {
  readonly versionId: string
  readonly questions: readonly PublicApplicationQuestionDto[]
}

export interface PublicApplicationUploadAuthorizationDto {
  readonly uploadId: string
  readonly signedUploadUrl: string
  readonly expiresAt: string
  readonly requiredHeaders: Readonly<Record<string, string>>
}

export interface PublicApplicationConfirmationDto {
  readonly submitted: true
  readonly submittedAt: string
  readonly job: { readonly id: string; readonly title: string }
}
