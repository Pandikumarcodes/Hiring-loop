export function createTalentPoolController(useCases) {
  const scope = (request) => ({
    organizationId: request.tenantContext.organizationId,
    talentPoolId: request.validated.params.talentPoolId,
    candidateId: request.validated.params.candidateId,
    actorUserId: request.auth.userId,
  });
  const handle =
    (name, status = 200) =>
    async (request, response, next) => {
      try {
        response.status(status).json({
          data: await useCases[name]({
            ...scope(request),
            data: request.validated.body,
            ...request.validated.query,
          }),
        });
      } catch (error) {
        next(error);
      }
    };
  return {
    list: handle('list'),
    create: handle('create', 201),
    update: handle('update'),
    listMembers: handle('listMembers'),
    addMember: handle('addMember', 201),
    removeMember: async (request, response, next) => {
      try {
        await useCases.removeMember(scope(request));
        response.status(204).end();
      } catch (error) {
        next(error);
      }
    },
  };
}
