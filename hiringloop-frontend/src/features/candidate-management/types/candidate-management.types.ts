export type CandidateSort =
  | 'newestApplication'
  | 'oldestApplication'
  | 'nameAsc'
  | 'nameDesc'

export const CANDIDATE_SORTS: readonly [CandidateSort, string][] = [
  ['newestApplication', 'Newest application'],
  ['oldestApplication', 'Oldest application'],
  ['nameAsc', 'Name A–Z'],
  ['nameDesc', 'Name Z–A'],
]

export interface CandidateStageDto {
  readonly id: string
  readonly name: string
}

export interface CandidateJobDto {
  readonly id: string
  readonly title: string
}

export interface CandidateApplicationSummaryDto {
  readonly id: string
  readonly job: CandidateJobDto
  readonly currentStage: CandidateStageDto | null
  readonly submittedAt: string
}

export interface CandidateListItemDto {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly applicationCount: number
  readonly latestApplication: CandidateApplicationSummaryDto | null
}

export interface CandidatePageDto {
  readonly candidates: readonly CandidateListItemDto[]
  readonly pagination: {
    readonly page: number
    readonly limit: number
    readonly totalItems: number
    readonly totalPages: number
  }
}

export interface CandidateListFilters {
  readonly page: number
  readonly pageSize: number
  readonly search?: string
  readonly jobId?: string
  readonly stageId?: string
  readonly sort: CandidateSort
}

export interface CandidateDetailDto {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly phone: string | null
  readonly createdAt: string
  readonly applications: readonly CandidateApplicationSummaryDto[]
}

export type ApplicationQuestionType =
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'NUMBER'
  | 'YES_NO'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'DATE'
  | 'URL'

export interface ApplicationAnswerDto {
  readonly question: {
    readonly id: string
    readonly type: ApplicationQuestionType
    readonly label: string
    readonly description: string | null
    readonly required: boolean
    readonly sortOrder: number
  }
  readonly value: unknown
  readonly selectedOptions: readonly {
    readonly id: string
    readonly label: string
  }[]
}

export interface ApplicationDocumentDto {
  readonly id: string
  readonly fileName: string
  readonly contentType: string
  readonly type: string
  readonly createdAt: string
}

export interface ApplicationStageHistoryDto {
  readonly id: string
  readonly event: string
  readonly occurredAt: string
  readonly fromStage: CandidateStageDto | null
  readonly toStage: CandidateStageDto | null
}

export interface ApplicationDetailDto {
  readonly id: string
  readonly submittedAt: string
  readonly formVersionId: string
  readonly candidate: {
    readonly id: string
    readonly name: string
    readonly email: string
    readonly phone: string | null
  }
  readonly job: CandidateJobDto
  readonly currentStage: CandidateStageDto | null
  readonly answers: readonly ApplicationAnswerDto[]
  readonly documents: readonly ApplicationDocumentDto[]
  readonly stageHistory: readonly ApplicationStageHistoryDto[]
}

export interface DocumentAccessDto {
  readonly url: string
  readonly expiresAt: string
  readonly fileName: string
  readonly contentType: string
}
