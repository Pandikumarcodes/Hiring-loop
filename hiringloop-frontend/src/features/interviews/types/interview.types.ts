export type InterviewFormat = 'VIDEO' | 'PHONE' | 'ONSITE'
export type InterviewStatus = 'SCHEDULED' | 'CANCELLED'
export interface InterviewDto {
  id: string
  title: string
  format: InterviewFormat
  status: InterviewStatus
  scheduledStartAt: string
  scheduledEndAt: string
  timeZone: string
  meetingUrl: string | null
  location: string | null
  participants: readonly { id: string; user: { id: string; email: string } }[]
  application: {
    id: string
    candidate: { id: string; name: string; email: string }
    job: { id: string; title: string }
  }
  cancellation: {
    cancelledAt: string | null
    cancelledByUserId: string | null
    reason: string | null
  } | null
}
export interface ScheduleInterviewInput {
  title: string
  format: InterviewFormat
  scheduledStartAt: string
  durationMinutes: number
  timeZone: string
  participantUserIds: string[]
  meetingUrl?: string | null
  location?: string | null
}
export type UpdateInterviewInput = Pick<
  ScheduleInterviewInput,
  'title' | 'format' | 'participantUserIds' | 'meetingUrl' | 'location'
>
export interface RescheduleInterviewInput {
  scheduledStartAt: string
  durationMinutes: number
  timeZone: string
}
