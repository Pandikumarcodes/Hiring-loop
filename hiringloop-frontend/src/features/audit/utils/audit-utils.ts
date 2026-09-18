import {
  formatTimestamp,
  humanize,
} from '../../analytics/utils/analytics-utils'

const actionLabels: Record<string, string> = {
  OFFER_SENT: 'Offer sent',
  OFFER_ACCEPTED: 'Offer accepted',
  OFFER_DECLINED: 'Offer declined',
  OFFER_WITHDRAWN: 'Offer withdrawn',
  APPLICATION_HIRED: 'Application hired',
  APPLICATION_REJECTED: 'Application rejected',
  APPLICATION_REOPENED: 'Application reopened',
  INTERVIEW_SCHEDULED: 'Interview scheduled',
  INTERVIEW_CANCELLED: 'Interview cancelled',
  MEMBERSHIP_ROLE_CHANGED: 'Membership role changed',
}

export function actionLabel(action: string) {
  return actionLabels[action] ?? humanize(action)
}

export function resourceLabel(resourceType: string, resourceId: string) {
  return `${humanize(resourceType)} · ${resourceId.length > 10 ? `${resourceId.slice(0, 6)}…` : resourceId}`
}

export { formatTimestamp }
