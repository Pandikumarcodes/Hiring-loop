import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/middleware/error-handler.js';
import { createOfferRouter } from '../../src/modules/offers/routes/offer-routes.js';
import {
  editOfferBodySchema,
  offerTermsSchema,
} from '../../src/modules/offers/schemas/offer-schemas.js';
import { templateUpdateBody } from '../../src/modules/communications/communications-module.js';
import { PERMISSIONS } from '../../src/authorization/permissions.js';

const organizationId = '8a2f2616-5a08-4a93-9bf6-24c609b6f41d';
const offerId = '652d23d0-042d-4ea9-ac91-2f7696d7b087';
const terms = {
  jobTitle: 'Staff Engineer',
  currency: 'USD',
  baseCompensationMinor: '250000',
  expectedRevision: 3,
};

function appForOffer({ allow = true, editDraft = vi.fn() } = {}) {
  const app = express();
  app.use(express.json());
  app.use(
    '/organizations/:organizationId',
    createOfferRouter({
      authenticateSession: (req, _res, next) => {
        req.auth = { userId: 'user-1' };
        next();
      },
      requireCsrf: (_req, _res, next) => next(),
      tenantContextMiddleware: (req, _res, next) => {
        req.tenantContext = {
          organizationId: req.params.organizationId,
          membershipId: 'membership-1',
          role: allow ? 'ADMIN' : 'INTERVIEWER',
        };
        next();
      },
      offerUseCases: { editDraft },
    }),
  );
  app.use(errorHandler);
  return { app, editDraft };
}

describe('offer and communication-template request contracts', () => {
  it('accepts the frontend offer edit shape and passes parsed terms to the use case', async () => {
    const { app, editDraft } = appForOffer({
      editDraft: vi.fn().mockResolvedValue({ id: 'version-1' }),
    });

    const response = await request(app)
      .patch(`/organizations/${organizationId}/offers/${offerId}/draft`)
      .send(terms);

    expect(response.status).toBe(200);
    expect(editDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        offerId,
        data: expect.objectContaining({
          ...terms,
          baseCompensationMinor: 250000n,
        }),
      }),
    );
  });

  it('rejects route identifiers and other unknown fields in strict request bodies', () => {
    expect(
      editOfferBodySchema.safeParse({ ...terms, id: offerId }).success,
    ).toBe(false);
    expect(
      templateUpdateBody.safeParse({
        ...terms,
        name: 'Offer',
        body: 'Body',
        id: offerId,
      }).success,
    ).toBe(false);
  });

  it('requires the offer update permission before invoking the use case', async () => {
    const { app, editDraft } = appForOffer({ allow: false });

    const response = await request(app)
      .patch(`/organizations/${organizationId}/offers/${offerId}/draft`)
      .send(terms);

    expect(response.status).toBe(403);
    expect(editDraft).not.toHaveBeenCalled();
  });

  it('keeps the server validators strict and preserves their required fields', () => {
    const { expectedRevision: _expectedRevision, ...offerTerms } = terms;
    expect(offerTermsSchema.safeParse(offerTerms).success).toBe(true);
    expect(
      templateUpdateBody.safeParse({
        name: 'Offer',
        subject: 'Your offer',
        body: 'Congratulations',
        expectedRevision: 2,
      }).success,
    ).toBe(true);
    expect(PERMISSIONS.OFFER_UPDATE).toBeDefined();
  });
});
