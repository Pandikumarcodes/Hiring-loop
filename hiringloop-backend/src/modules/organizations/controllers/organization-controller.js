import { notFoundError } from '../../../errors/application-error.js';

export function createOrganizationController({
  createOrganizationForUser,
  listOrganizationsForUser,
  getOrganizationForUser,
}) {
  return {
    create: async (request, response, next) => {
      try {
        const organization = await createOrganizationForUser({
          userId: request.auth.userId,
          organizationInput: request.validated.body,
        });
        response.status(201).json({ data: { organization } });
      } catch (error) {
        next(error);
      }
    },
    list: async (request, response, next) => {
      try {
        const organizations = await listOrganizationsForUser(
          request.auth.userId,
        );
        response.status(200).json({ data: { organizations } });
      } catch (error) {
        next(error);
      }
    },
    get: async (request, response, next) => {
      try {
        const organization = await getOrganizationForUser({
          userId: request.auth.userId,
          organizationId: request.validated.params.organizationId,
        });
        if (!organization) {
          throw notFoundError();
        }
        response.status(200).json({ data: { organization } });
      } catch (error) {
        next(error);
      }
    },
  };
}
