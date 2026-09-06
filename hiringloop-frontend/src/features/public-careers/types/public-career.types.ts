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
