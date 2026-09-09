export type OfferStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'WITHDRAWN'
export interface OfferVersionDto {
  id: string
  versionNumber: number
  jobTitle: string
  currency: string
  baseCompensationMinor: string
  bonusCompensationMinor: string | null
  additionalCompensationText: string | null
  startDate: string | null
  expirationDate: string | null
  location: string | null
  workplaceType: 'ONSITE' | 'HYBRID' | 'REMOTE' | null
  additionalTerms: string | null
  revision: number
  issuedAt: string | null
  createdAt: string
}
export interface OfferDto {
  id: string
  applicationId: string
  status: OfferStatus
  revision: number
  sentAt: string | null
  acceptedAt: string | null
  declinedAt: string | null
  withdrawnAt: string | null
  currentVersion: OfferVersionDto | null
  versions?: readonly {
    id: string
    versionNumber: number
    issuedAt: string | null
    createdAt: string
  }[]
}
export interface OfferTermsInput {
  jobTitle: string
  currency: string
  baseCompensationMinor: string
  bonusCompensationMinor?: string
  additionalCompensationText?: string
  startDate?: string
  expirationDate?: string
  location?: string
  workplaceType?: 'ONSITE' | 'HYBRID' | 'REMOTE'
  additionalTerms?: string
}
export interface OutcomeDto {
  applicationId: string
  outcome: 'ACTIVE' | 'HIRED' | 'REJECTED'
  outcomeRevision: number
  outcomeUpdatedAt: string | null
  history: readonly {
    id: string
    type: string
    reasonCode: string | null
    reasonDetails: string | null
    occurredAt: string
  }[]
}
