export const interviewKeys = {
  all: ['interviews'] as const,
  application: (organizationId: string, applicationId: string) =>
    ['interviews', 'application', organizationId, applicationId] as const,
  calendar: (organizationId: string, from: string, to: string, mine: boolean) =>
    ['interviews', 'calendar', organizationId, from, to, mine] as const,
  detail: (organizationId: string, interviewId: string) =>
    ['interviews', 'detail', organizationId, interviewId] as const,
}
