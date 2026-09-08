export function createInterviewController(useCases) {
  const actor = (request) => ({
    organizationId: request.tenantContext.organizationId,
    actorRole: request.tenantContext.role,
    actorUserId: request.auth.userId,
  });
  const resourceInput = (request) => ({
    ...actor(request),
    ...request.validated.params,
  });

  return {
    schedule: async (request, response, next) => {
      try {
        response.status(201).json({
          data: {
            interview: await useCases.schedule({
              ...actor(request),
              applicationId: request.validated.params.applicationId,
              ...request.validated.body,
            }),
          },
        });
      } catch (error) {
        next(error);
      }
    },
    listForApplication: async (request, response, next) => {
      try {
        response.status(200).json({
          data: {
            interviews: await useCases.listForApplication(
              resourceInput(request),
            ),
          },
        });
      } catch (error) {
        next(error);
      }
    },
    listForOrganization: async (request, response, next) => {
      try {
        response.status(200).json({
          data: {
            interviews: await useCases.listForOrganization({
              ...actor(request),
              ...request.validated.params,
              ...request.validated.query,
            }),
          },
        });
      } catch (error) {
        next(error);
      }
    },
    detail: async (request, response, next) => {
      try {
        response.status(200).json({
          data: { interview: await useCases.detail(resourceInput(request)) },
        });
      } catch (error) {
        next(error);
      }
    },
    update: async (request, response, next) => {
      try {
        response.status(200).json({
          data: {
            interview: await useCases.update({
              ...resourceInput(request),
              ...request.validated.body,
            }),
          },
        });
      } catch (error) {
        next(error);
      }
    },
    reschedule: async (request, response, next) => {
      try {
        response.status(200).json({
          data: {
            interview: await useCases.reschedule({
              ...resourceInput(request),
              ...request.validated.body,
            }),
          },
        });
      } catch (error) {
        next(error);
      }
    },
    cancel: async (request, response, next) => {
      try {
        response.status(200).json({
          data: {
            interview: await useCases.cancel({
              ...resourceInput(request),
              ...request.validated.body,
            }),
          },
        });
      } catch (error) {
        next(error);
      }
    },
  };
}
