export function createMemberController({
  listMembers,
  updateMemberRole,
  removeMember,
}) {
  return {
    list: async (request, response, next) => {
      try {
        const members = await listMembers({
          organizationId: request.tenantContext.organizationId,
        });
        response.status(200).json({ data: { members } });
      } catch (error) {
        next(error);
      }
    },
    updateRole: async (request, response, next) => {
      try {
        const member = await updateMemberRole({
          organizationId: request.tenantContext.organizationId,
          membershipId: request.validated.params.membershipId,
          role: request.validated.body.role,
        });
        response.status(200).json({ data: { member } });
      } catch (error) {
        next(error);
      }
    },
    remove: async (request, response, next) => {
      try {
        const result = await removeMember({
          organizationId: request.tenantContext.organizationId,
          membershipId: request.validated.params.membershipId,
        });
        response.status(200).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  };
}
