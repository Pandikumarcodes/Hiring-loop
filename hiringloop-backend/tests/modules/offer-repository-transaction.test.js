import { describe, expect, it, vi } from 'vitest';
import { createOfferRepository } from '../../src/modules/offers/repositories/offer-repository.js';

describe('offer repository transaction reads', () => {
  it('reads the transitioned offer through the transaction client', async () => {
    const committed = { id: 'offer', status: 'WITHDRAWN', revision: 2 };
    const db = {
      offer: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ status: 'DRAFT', currentVersion: null })
          .mockResolvedValueOnce(committed),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: vi.fn((callback) => callback(db)),
      offer: { findFirst: vi.fn() },
    };
    const repository = createOfferRepository(prisma);
    const result = await repository.transition({
      organizationId: 'org',
      offerId: 'offer',
      actorUserId: 'actor',
      expectedRevision: 1,
      from: ['DRAFT'],
      to: 'WITHDRAWN',
      timestampField: 'withdrawnAt',
      now: new Date(),
    });
    expect(result).toBe(committed);
    expect(db.offer.findFirst).toHaveBeenCalledTimes(2);
    expect(db.offer.findFirst).toHaveBeenLastCalledWith({
      where: { id: 'offer', organizationId: 'org' },
      include: {
        currentVersion: true,
        versions: { orderBy: { versionNumber: 'desc' } },
      },
    });
    expect(prisma.offer.findFirst).not.toHaveBeenCalled();
  });
});
