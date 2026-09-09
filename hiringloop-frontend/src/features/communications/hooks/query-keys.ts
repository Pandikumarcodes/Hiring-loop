export const communicationKeys = {
  history: (organizationId: string, applicationId: string, page: number) =>
    ['communications', organizationId, applicationId, page] as const,
  templates: (organizationId: string) =>
    ['communication-templates', organizationId] as const,
}
