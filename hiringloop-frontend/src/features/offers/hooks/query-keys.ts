export const offerKeys = {
  offer: (organizationId: string, applicationId: string) =>
    ['offers', organizationId, applicationId] as const,
  outcome: (organizationId: string, applicationId: string) =>
    ['application-outcomes', organizationId, applicationId] as const,
}
