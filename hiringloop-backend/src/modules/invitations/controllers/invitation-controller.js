export function createInvitationController({
  createInvitation,
  listInvitations,
  revokeInvitation,
  acceptInvitation,
}) {
  return {
    create: async (request, response, next) => {
      try {
        const invitation = await createInvitation({
          organizationId: request.tenantContext.organizationId,
          inviterMembershipId: request.tenantContext.membershipId,
          ...request.validated.body,
        });
        response.status(201).json({ data: { invitation } });
      } catch (error) {
        next(error);
      }
    },
    list: async (request, response, next) => {
      try {
        const invitations = await listInvitations({
          organizationId: request.tenantContext.organizationId,
        });
        response.status(200).json({ data: { invitations } });
      } catch (error) {
        next(error);
      }
    },
    revoke: async (request, response, next) => {
      try {
        const invitation = await revokeInvitation({
          organizationId: request.tenantContext.organizationId,
          invitationId: request.validated.params.invitationId,
        });
        response.status(200).json({ data: { invitation } });
      } catch (error) {
        next(error);
      }
    },
    accept: async (request, response, next) => {
      try {
        const result = await acceptInvitation({
          ...request.validated.body,
          auth: request.auth,
        });
        response.status(200).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  };
}
