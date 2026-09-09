export type CommunicationStatus = 'PENDING' | 'SENT' | 'FAILED'

export interface CommunicationDto {
  id: string
  recipientEmail: string
  subject: string
  body: string
  status: CommunicationStatus
  provider?: string | null
  failureCategory?: string | null
  sender?: { id: string; email: string }
  sentAt: string | null
  failedAt: string | null
  createdAt: string
}

export interface CommunicationPageDto {
  data: readonly CommunicationDto[]
  pagination: { page: number; pageSize: number }
}

export interface CommunicationTemplateDto {
  id: string
  organizationId: string
  name: string
  subject: string
  body: string
  revision: number
  createdAt: string
  updatedAt: string
}

export interface TemplatePageDto {
  data: readonly CommunicationTemplateDto[]
  pagination: { page: number; pageSize: number }
}

export interface SendCommunicationResult {
  communication: CommunicationDto
  deliveryState?: 'UNCONFIRMED'
}

export interface TemplateInput {
  name: string
  subject: string
  body: string
  expectedRevision?: number
}
