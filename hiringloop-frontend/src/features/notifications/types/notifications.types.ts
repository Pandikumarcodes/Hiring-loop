export type NotificationType =
  | 'CANDIDATE_COMMUNICATION_FAILED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_RESCHEDULED'
  | 'INTERVIEW_CANCELLED'
  | 'SCORECARD_SUBMITTED'
export interface NotificationDto {
  id: string
  type: NotificationType
  title: string
  message: string
  applicationId: string | null
  interviewId: string | null
  readAt: string | null
  createdAt: string
}
export interface NotificationPageDto {
  data: readonly NotificationDto[]
  pagination: { page: number; pageSize: number }
}
export interface NotificationPreferenceDto {
  notificationType: NotificationType
  enabled: boolean
}
