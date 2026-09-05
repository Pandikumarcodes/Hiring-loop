export const JOB_STATUSES = ['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'] as const
export type JobStatus = (typeof JOB_STATUSES)[number]
export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'TEMPORARY',
  'INTERNSHIP',
  'OTHER',
] as const
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]
export const WORKPLACE_TYPES = ['ONSITE', 'HYBRID', 'REMOTE'] as const
export type WorkplaceType = (typeof WORKPLACE_TYPES)[number]
export type JobSortBy = 'updatedAt' | 'createdAt' | 'title' | 'openedAt'
export type SortOrder = 'asc' | 'desc'

export interface JobListDto {
  readonly id: string
  readonly title: string
  readonly department: string | null
  readonly employmentType: EmploymentType | null
  readonly workplaceType: WorkplaceType | null
  readonly location: string | null
  readonly openings: number
  readonly status: JobStatus
  readonly openedAt: string | null
  readonly closedAt: string | null
  readonly archivedAt: string | null
  readonly version: number
  readonly createdAt: string
  readonly updatedAt: string
}
export interface JobDetailDto extends JobListDto {
  readonly description: string | null
}
export interface JobInput {
  readonly title: string
  readonly department?: string | null
  readonly employmentType?: EmploymentType
  readonly workplaceType?: WorkplaceType
  readonly location?: string | null
  readonly description?: string | null
  readonly openings?: number
}
export interface JobFilters {
  readonly page: number
  readonly limit: number
  readonly search?: string
  readonly status?: JobStatus
  readonly employmentType?: EmploymentType
  readonly workplaceType?: WorkplaceType
  readonly sortBy: JobSortBy
  readonly sortOrder: SortOrder
}
export interface JobPage {
  readonly jobs: readonly JobListDto[]
  readonly pagination: {
    readonly page: number
    readonly limit: number
    readonly totalItems: number
    readonly totalPages: number
  }
}
