import type { JsonValue } from '../../../shared/types'

export type AuditActorType = 'USER' | 'SYSTEM'

export interface AuditActor {
  readonly id: string
  readonly email: string
}

export interface AuditEvent {
  readonly id: string
  readonly actorType: AuditActorType
  readonly action: string
  readonly resourceType: string
  readonly resourceId: string
  readonly before: JsonValue | null
  readonly after: JsonValue | null
  readonly metadata: JsonValue | null
  readonly occurredAt: string
  readonly actor: AuditActor | null
}

export interface AuditFilters {
  readonly from?: string
  readonly to?: string
  readonly actorUserId?: string
  readonly action?: string
  readonly resourceType?: string
  readonly resourceId?: string
}

export interface AuditListPage {
  readonly auditEvents: readonly AuditEvent[]
  readonly pagination: {
    readonly page: number
    readonly pageSize: number
    readonly totalItems: number
    readonly totalPages: number
  }
}
