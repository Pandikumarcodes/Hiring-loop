export type ApplicationFormQuestionType =
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'NUMBER'
  | 'YES_NO'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'DATE'
  | 'URL'

export interface ApplicationFormOptionDto {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly sortOrder: number
}
export interface ApplicationFormQuestionDto {
  readonly id: string
  readonly questionKey: string
  readonly type: ApplicationFormQuestionType
  readonly label: string
  readonly description: string | null
  readonly placeholder: string | null
  readonly required: boolean
  readonly sortOrder: number
  readonly options: readonly ApplicationFormOptionDto[]
}
export interface ApplicationFormVersionDto {
  readonly id: string
  readonly versionNumber: number
  readonly status: 'PUBLISHED' | 'DRAFT'
  readonly revision: number
  readonly publishedAt: string | null
  readonly questions: readonly ApplicationFormQuestionDto[]
}
export interface ApplicationFormBuilderDto {
  readonly id: string
  readonly jobId: string
  readonly activeVersion: ApplicationFormVersionDto
  readonly draft: ApplicationFormVersionDto | null
}
export interface QuestionInput {
  readonly type: ApplicationFormQuestionType
  readonly label: string
  readonly description: string | null
  readonly placeholder: string | null
  readonly required: boolean
  readonly options?: readonly { label: string; value: string }[]
  readonly expectedRevision: number
}
