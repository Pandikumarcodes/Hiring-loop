export function createApplicationOutcomeController(useCases) {
  const input = (request) => ({
    organizationId: request.tenantContext.organizationId,
    applicationId: request.validated.params.applicationId,
    actorUserId: request.auth.userId,
    data: request.validated.body,
  });
  const action = (name) => async (request, response, next) => {
    try {
      response.json({ data: await useCases[name](input(request)) });
    } catch (error) {
      next(error);
    }
  };
  return {
    hire: action('hire'),
    reject: action('reject'),
    reopen: action('reopen'),
  };
}
