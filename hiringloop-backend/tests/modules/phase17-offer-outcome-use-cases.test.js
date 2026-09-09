import { describe, expect, it, vi } from 'vitest';
import { createOfferUseCases } from '../../src/modules/offers/use-cases/offer-use-cases.js';
import { createApplicationOutcomeUseCases } from '../../src/modules/applications/use-cases/application-outcome-use-cases.js';

const org = '00000000-0000-4000-8000-000000000001';
const offer = (overrides = {}) => ({
  id: '00000000-0000-4000-8000-000000000002',
  applicationId: '00000000-0000-4000-8000-000000000003',
  status: 'DRAFT',
  revision: 1,
  currentVersion: {
    id: '00000000-0000-4000-8000-000000000004',
    versionNumber: 1,
    jobTitle: 'Engineer',
    currency: 'USD',
    baseCompensationMinor: 100n,
    revision: 1,
    issuedAt: null,
    createdAt: new Date(),
  },
  versions: [],
  ...overrides,
});
const terms = {
  jobTitle: 'Engineer',
  currency: 'USD',
  baseCompensationMinor: 100n,
};

describe('Phase 17 offer use cases', () => {
  it('serializes compensation safely and rejects missing offers', async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(offer()),
      findByApplication: vi.fn(),
    };
    const useCases = createOfferUseCases({ offerRepository: repository });
    expect(
      (await useCases.get({ organizationId: org, offerId: offer().id }))
        .currentVersion.baseCompensationMinor,
    ).toBe('100');
    repository.findById.mockResolvedValueOnce(null);
    await expect(
      useCases.get({ organizationId: org, offerId: offer().id }),
    ).rejects.toMatchObject({ code: 'OFFER_NOT_FOUND', status: 404 });
  });
  it('maps stale draft edits and immutable issued versions to structured errors', async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(offer()),
      updateDraftVersion: vi.fn().mockResolvedValue({ count: 0 }),
      getVersion: vi.fn(),
    };
    const useCases = createOfferUseCases({ offerRepository: repository });
    await expect(
      useCases.editDraft({
        organizationId: org,
        offerId: offer().id,
        data: { ...terms, expectedRevision: 1 },
      }),
    ).rejects.toMatchObject({ code: 'OFFER_VERSION_CONFLICT' });
    repository.findById.mockResolvedValueOnce(
      offer({
        currentVersion: { ...offer().currentVersion, issuedAt: new Date() },
      }),
    );
    await expect(
      useCases.editDraft({
        organizationId: org,
        offerId: offer().id,
        data: { ...terms, expectedRevision: 1 },
      }),
    ).rejects.toMatchObject({ code: 'OFFER_VERSION_IMMUTABLE' });
  });
  it('makes an existing pending send retry-safe without dispatching', async () => {
    const { createHash } = await import('node:crypto');
    const key = '00000000-0000-4000-8000-000000000005';
    const communication = {
      id: 'communication',
      status: 'PENDING',
      payloadHash: createHash('sha256')
        .update(`${offer().currentVersion.id}:1:${key}`)
        .digest('hex'),
    };
    const repository = {
      findById: vi.fn().mockResolvedValue(offer()),
      prepareSend: vi.fn().mockResolvedValue({
        outcome: 'existing',
        offer: offer(),
        communication,
      }),
      claimFailedCommunication: vi.fn(),
    };
    const delivery = { dispatchPersisted: vi.fn() };
    const result = await createOfferUseCases({
      offerRepository: repository,
      communicationService: delivery,
      provider: 'test',
    }).send({
      organizationId: org,
      offerId: offer().id,
      actorUserId: 'actor',
      data: {
        expectedRevision: 1,
        idempotencyKey: key,
      },
    });
    expect(result).toMatchObject({
      status: 'PENDING',
      retrySafe: true,
      unconfirmed: true,
    });
    expect(delivery.dispatchPersisted).not.toHaveBeenCalled();
  });
  it('allows a FAILED send retry only after an atomic claim', async () => {
    const version = offer().currentVersion;
    const key = '00000000-0000-4000-8000-000000000005';
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256')
      .update(`${version.id}:1:${key}`)
      .digest('hex');
    const repository = {
      findById: vi.fn().mockResolvedValue(offer()),
      prepareSend: vi.fn().mockResolvedValue({
        outcome: 'existing',
        offer: offer(),
        communication: {
          id: 'communication',
          status: 'FAILED',
          payloadHash: hash,
        },
      }),
      claimFailedCommunication: vi.fn().mockResolvedValue({ count: 1 }),
    };
    const delivery = {
      dispatchPersisted: vi.fn().mockResolvedValue({ kind: 'SENT' }),
    };
    await expect(
      createOfferUseCases({
        offerRepository: repository,
        communicationService: delivery,
        provider: 'test',
      }).send({
        organizationId: org,
        offerId: offer().id,
        actorUserId: 'actor',
        data: { expectedRevision: 1, idempotencyKey: key },
      }),
    ).resolves.toMatchObject({ status: 'SENT' });
    expect(delivery.dispatchPersisted).toHaveBeenCalledTimes(1);
  });
  it('rejects invalid terminal transitions', async () => {
    const repository = {
      transition: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(offer({ status: 'ACCEPTED' })),
    };
    await expect(
      createOfferUseCases({ offerRepository: repository }).transition({
        organizationId: org,
        offerId: offer().id,
        actorUserId: 'actor',
        expectedRevision: 1,
        operation: 'decline',
      }),
    ).rejects.toMatchObject({ code: 'OFFER_INVALID_TRANSITION' });
  });
});

describe('Phase 17 outcome use cases', () => {
  it('requires an accepted offer to hire', async () => {
    const repository = {
      find: vi.fn().mockResolvedValue({ id: 'app' }),
      findAcceptedOffer: vi.fn().mockResolvedValue(null),
    };
    await expect(
      createApplicationOutcomeUseCases({ outcomeRepository: repository }).hire({
        organizationId: org,
        applicationId: 'app',
        actorUserId: 'actor',
        data: { expectedRevision: 1 },
      }),
    ).rejects.toMatchObject({
      code: 'APPLICATION_HIRE_REQUIRES_ACCEPTED_OFFER',
    });
  });
  it('maps atomic conditional-update loss to an outcome conflict', async () => {
    const repository = {
      find: vi.fn().mockResolvedValue({ id: 'app' }),
      findAcceptedOffer: vi.fn().mockResolvedValue({ id: 'offer' }),
      transition: vi.fn().mockResolvedValue({ outcome: 'conflict' }),
    };
    await expect(
      createApplicationOutcomeUseCases({ outcomeRepository: repository }).hire({
        organizationId: org,
        applicationId: 'app',
        actorUserId: 'actor',
        data: { expectedRevision: 1 },
      }),
    ).rejects.toMatchObject({
      code: 'APPLICATION_OUTCOME_CONFLICT',
      status: 409,
    });
  });
});
