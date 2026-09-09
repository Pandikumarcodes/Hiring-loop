import { createHash } from 'node:crypto';
import { ApplicationError } from '../../../errors/application-error.js';
import { generateEntityId } from '../../../utils/ids.js';
import { toOfferDto, toOfferVersionDto } from '../domain/offer-dto.js';
const fail = (status, code, message) =>
  new ApplicationError({ status, code, message });
const terms = ({
  jobTitle,
  currency,
  baseCompensationMinor,
  bonusCompensationMinor,
  additionalCompensationText,
  startDate,
  expirationDate,
  location,
  workplaceType,
  additionalTerms,
}) => ({
  jobTitle,
  currency,
  baseCompensationMinor,
  bonusCompensationMinor: bonusCompensationMinor ?? null,
  additionalCompensationText: additionalCompensationText ?? null,
  startDate: startDate ?? null,
  expirationDate: expirationDate ?? null,
  location: location ?? null,
  workplaceType: workplaceType ?? null,
  additionalTerms: additionalTerms ?? null,
});
export function createOfferUseCases({
  offerRepository,
  communicationService,
  provider,
  clock = () => new Date(),
}) {
  const get = async ({ organizationId, offerId, applicationId }) => {
    const offer = applicationId
      ? await offerRepository.findByApplication({
          organizationId,
          applicationId,
        })
      : await offerRepository.findById({ organizationId, offerId });
    if (!offer) throw fail(404, 'OFFER_NOT_FOUND', 'Offer not found');
    return toOfferDto(offer);
  };
  return {
    get,
    async create({ organizationId, applicationId, actorUserId, data }) {
      try {
        const result = await offerRepository.createWithInitialVersion({
          organizationId,
          applicationId,
          actorUserId,
          offerId: generateEntityId(),
          versionId: generateEntityId(),
          terms: terms(data),
        });
        if (result.outcome === 'application_missing')
          throw fail(404, 'APPLICATION_NOT_FOUND', 'Application not found');
        return toOfferDto(result.offer);
      } catch (error) {
        if (error?.code === 'P2002')
          throw fail(409, 'OFFER_ALREADY_EXISTS', 'Offer already exists');
        throw error;
      }
    },
    async editDraft({ organizationId, offerId, data }) {
      const offer = await offerRepository.findById({ organizationId, offerId });
      if (!offer) throw fail(404, 'OFFER_NOT_FOUND', 'Offer not found');
      if (['ACCEPTED', 'DECLINED', 'WITHDRAWN'].includes(offer.status))
        throw fail(409, 'OFFER_INVALID_TRANSITION', 'Offer is terminal');
      if (!offer.currentVersion || offer.currentVersion.issuedAt)
        throw fail(
          409,
          'OFFER_VERSION_IMMUTABLE',
          'Issued offer versions cannot be edited',
        );
      const updated = await offerRepository.updateDraftVersion({
        organizationId,
        offerId,
        versionId: offer.currentVersion.id,
        expectedRevision: data.expectedRevision,
        terms: terms(data),
      });
      if (!updated.count)
        throw fail(409, 'OFFER_VERSION_CONFLICT', 'Offer version is stale');
      return toOfferVersionDto(
        await offerRepository.getVersion({
          organizationId,
          versionId: offer.currentVersion.id,
        }),
      );
    },
    async revise({ organizationId, offerId, actorUserId, data }) {
      const result = await offerRepository.createRevision({
        organizationId,
        offerId,
        actorUserId,
        expectedRevision: data.expectedRevision,
        versionId: generateEntityId(),
        terms: terms(data),
      });
      if (result.outcome === 'missing')
        throw fail(404, 'OFFER_NOT_FOUND', 'Offer not found');
      if (result.outcome !== 'created')
        throw fail(
          409,
          'OFFER_VERSION_CONFLICT',
          'Offer changed or is terminal',
        );
      return toOfferDto(result.offer);
    },
    async send({ organizationId, offerId, actorUserId, data }) {
      const existingOffer = await offerRepository.findById({
        organizationId,
        offerId,
      });
      if (!existingOffer) throw fail(404, 'OFFER_NOT_FOUND', 'Offer not found');
      const payloadHash = createHash('sha256')
        .update(
          `${existingOffer.currentVersion?.id ?? 'none'}:${data.expectedRevision}:${data.idempotencyKey}`,
        )
        .digest('hex');
      let result;
      try {
        result = await offerRepository.prepareSend({
          organizationId,
          offerId,
          actorUserId,
          expectedRevision: data.expectedRevision,
          idempotencyKey: data.idempotencyKey,
          payloadHash,
          communicationId: generateEntityId(),
          provider,
          now: clock(),
        });
      } catch (error) {
        if (error?.code !== 'P2002') throw error;
        const communication = await offerRepository.findCommunication({
          organizationId,
          applicationId: existingOffer.applicationId,
          actorUserId,
          idempotencyKey: data.idempotencyKey,
        });
        if (!communication) throw error;
        result = { outcome: 'existing', offer: existingOffer, communication };
      }
      if (result.outcome === 'recipient_missing')
        throw fail(
          409,
          'OFFER_RECIPIENT_UNAVAILABLE',
          'Offer recipient is unavailable',
        );
      if (result.outcome === 'invalid')
        throw fail(409, 'OFFER_INVALID_TRANSITION', 'Offer cannot be sent');
      const communication = result.communication;
      if (
        result.outcome === 'existing' &&
        communication.payloadHash !== payloadHash
      )
        throw fail(
          409,
          'COMMUNICATION_IDEMPOTENCY_CONFLICT',
          'Idempotency key was reused with a different communication',
        );
      let shouldDispatch = result.outcome === 'prepared';
      if (result.outcome === 'existing' && communication.status === 'FAILED')
        shouldDispatch = Boolean(
          (
            await offerRepository.claimFailedCommunication({
              communicationId: communication.id,
            })
          ).count,
        );
      if (!shouldDispatch)
        return {
          communicationId: communication.id,
          status: communication.status,
          retrySafe: true,
          unconfirmed: communication.status === 'PENDING',
        };
      const delivered = await communicationService.dispatchPersisted({
        communicationId: communication.id,
        organizationId,
        applicationId: result.offer.applicationId,
        createdByUserId: actorUserId,
      });
      if (delivered.kind === 'SENT')
        return { communicationId: communication.id, status: 'SENT' };
      if (delivered.kind === 'UNCONFIRMED')
        return {
          communicationId: communication.id,
          status: 'PENDING',
          unconfirmed: true,
        };
      throw fail(502, 'EMAIL_DELIVERY_FAILED', 'Email delivery failed');
    },
    async transition({
      organizationId,
      offerId,
      actorUserId,
      expectedRevision,
      operation,
    }) {
      const rule = {
        accept: { from: ['SENT'], to: 'ACCEPTED', field: 'acceptedAt' },
        decline: { from: ['SENT'], to: 'DECLINED', field: 'declinedAt' },
        withdraw: {
          from: ['DRAFT', 'SENT'],
          to: 'WITHDRAWN',
          field: 'withdrawnAt',
        },
      }[operation];
      const offer = await offerRepository.transition({
        organizationId,
        offerId,
        actorUserId,
        expectedRevision,
        from: rule.from,
        to: rule.to,
        timestampField: rule.field,
        now: clock(),
        requiresIssuedVersion: ['accept', 'decline'].includes(operation),
      });
      if (!offer) {
        if (!(await offerRepository.findById({ organizationId, offerId })))
          throw fail(404, 'OFFER_NOT_FOUND', 'Offer not found');
        throw fail(
          409,
          'OFFER_INVALID_TRANSITION',
          'Offer transition is not allowed',
        );
      }
      return toOfferDto(offer);
    },
  };
}
