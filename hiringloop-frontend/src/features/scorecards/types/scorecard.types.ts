export type CriterionType = 'RATING' | 'TEXT'
export type Recommendation = 'STRONG_NO' | 'NO' | 'MIXED' | 'YES' | 'STRONG_YES'
export interface Criterion {
  id: string
  label: string
  description: string | null
  type: CriterionType
  required: boolean
  position: number
}
export interface TemplateVersion {
  id: string
  versionNumber: number
  status: 'DRAFT' | 'PUBLISHED'
  title: string
  instructions: string | null
  revision: number
  publishedAt: string | null
  criteria: readonly Criterion[]
}
export interface ScorecardTemplate {
  id: string
  jobId: string
  activeVersion: TemplateVersion | null
  draft: TemplateVersion | null
}
export interface CriterionInput {
  id?: string
  label: string
  description?: string | null
  type: CriterionType
  required: boolean
  position: number
}
export interface TemplateInput {
  expectedRevision: number
  title: string
  instructions?: string | null
  criteria: readonly CriterionInput[]
}
export interface Response {
  criterionId: string
  ratingValue: number | null
  textValue: string | null
  comment: string | null
}
export interface Scorecard {
  id: string | null
  interviewId: string
  interviewParticipantId: string
  status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED'
  revision: number | null
  templateVersion: TemplateVersion | null
  responses: readonly Response[]
  overallRecommendation: Recommendation | null
  overallComment: string | null
  submittedAt: string | null
}
export interface ScorecardInput {
  expectedRevision?: number
  responses: readonly Response[]
  overallRecommendation?: Recommendation | null
  overallComment?: string | null
}
export interface ScorecardSummary {
  id?: string
  participant: { id: string; user?: { id: string } }
  status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED'
  submittedAt: string | null
  overallRecommendation: Recommendation | null
}
export interface InterviewScorecardSummary {
  interviewId: string
  participants: readonly ScorecardSummary[]
}
export interface SubmittedScorecard extends Omit<ScorecardSummary, 'id'> {
  id: string
  templateVersion: TemplateVersion
  responses: readonly Response[]
  overallComment: string | null
}
export interface ApplicationScorecards {
  applicationId: string
  interviews: readonly {
    id: string
    title: string
    scheduledStartAt: string
    participants: readonly {
      participant: { id: string; user: { id: string } }
      scorecard: SubmittedScorecard | null
    }[]
  }[]
}
export interface ApplicationNote {
  id: string
  applicationId: string
  author: { id: string }
  body: string
  revision: number
  createdAt: string
  updatedAt: string
}
