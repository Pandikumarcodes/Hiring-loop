export type PipelineStageKind = 'ENTRY' | 'STANDARD'

export interface PipelineStageDto {
  readonly id: string
  readonly name: string
  readonly kind: PipelineStageKind
  readonly position: number
}

export interface PipelineDto {
  readonly id: string
  readonly jobId: string
  readonly version: number
  readonly stages: readonly PipelineStageDto[]
  readonly createdAt: string
  readonly updatedAt: string
}
