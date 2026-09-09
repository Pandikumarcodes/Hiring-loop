export const toOfferVersionDto = (version) => ({
  id: version.id,
  versionNumber: version.versionNumber,
  jobTitle: version.jobTitle,
  currency: version.currency,
  baseCompensationMinor: version.baseCompensationMinor.toString(),
  bonusCompensationMinor: version.bonusCompensationMinor?.toString() ?? null,
  additionalCompensationText: version.additionalCompensationText,
  startDate: version.startDate,
  expirationDate: version.expirationDate,
  location: version.location,
  workplaceType: version.workplaceType,
  additionalTerms: version.additionalTerms,
  revision: version.revision,
  issuedAt: version.issuedAt,
  createdAt: version.createdAt,
});
export const toOfferDto = (offer) => ({
  id: offer.id,
  applicationId: offer.applicationId,
  status: offer.status,
  revision: offer.revision,
  sentAt: offer.sentAt,
  acceptedAt: offer.acceptedAt,
  declinedAt: offer.declinedAt,
  withdrawnAt: offer.withdrawnAt,
  currentVersion: offer.currentVersion
    ? toOfferVersionDto(offer.currentVersion)
    : null,
  versions: offer.versions?.map((version) => ({
    id: version.id,
    versionNumber: version.versionNumber,
    issuedAt: version.issuedAt,
    createdAt: version.createdAt,
  })),
});
