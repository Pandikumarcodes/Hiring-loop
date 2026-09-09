import { config } from '../../config/env.js';
import { getPrismaClient } from '../../database/client.js';
import {
  authenticateSession,
  requireCsrf,
  authEmailDelivery,
} from '../auth/auth-module.js';
import { createTenantContextMiddleware } from '../../middleware/tenant-context.js';
import { createOrganizationRepository } from '../organizations/repositories/organization-repository.js';
import { createResolveTenantContext } from '../organizations/use-cases/resolve-tenant-context.js';
import { createCandidateCommunicationService } from '../communications/candidate-communication-service.js';
import { createOfferRepository } from './repositories/offer-repository.js';
import { createOfferUseCases } from './use-cases/offer-use-cases.js';
import { createOfferRouter } from './routes/offer-routes.js';
const url =
  config.environment === 'test' ? config.testDatabaseUrl : config.databaseUrl;
const unavailable = async () => {
  throw new Error('Offer database is not configured');
};
const prisma = url ? getPrismaClient() : null;
const organizationRepository = prisma
  ? createOrganizationRepository(prisma)
  : { findMembershipForUserAndOrganization: unavailable };
const offerUseCases = prisma
  ? createOfferUseCases({
      offerRepository: createOfferRepository(prisma),
      communicationService: createCandidateCommunicationService({
        prisma,
        emailDelivery: authEmailDelivery,
      }),
      provider: config.email.provider,
    })
  : {
      get: unavailable,
      create: unavailable,
      editDraft: unavailable,
      revise: unavailable,
      send: unavailable,
      transition: unavailable,
    };
export const offerRouter = createOfferRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware: createTenantContextMiddleware({
    resolveTenantContext: createResolveTenantContext({
      organizationRepository,
    }),
  }),
  offerUseCases,
});
