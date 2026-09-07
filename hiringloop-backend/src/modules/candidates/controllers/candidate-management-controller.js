export function createCandidateManagementController(useCases) {
  const input = (request) => ({
    organizationId: request.tenantContext.organizationId,
    ...request.validated.params,
  });
  return {
    list: async (request, response, next) => {
      try {
        const result = await useCases.list({
          organizationId: request.tenantContext.organizationId,
          ...request.validated.query,
        });
        response.status(200).json({
          data: { candidates: result.candidates },
          pagination: result.pagination,
        });
      } catch (error) {
        next(error);
      }
    },
    candidateDetail: async (request, response, next) => {
      try {
        response.status(200).json({
          data: { candidate: await useCases.candidateDetail(input(request)) },
        });
      } catch (error) {
        next(error);
      }
    },
    applicationDetail: async (request, response, next) => {
      try {
        response.status(200).json({
          data: {
            application: await useCases.applicationDetail(input(request)),
          },
        });
      } catch (error) {
        next(error);
      }
    },
    accessDocument: async (request, response, next) => {
      try {
        response
          .status(200)
          .json({ data: await useCases.accessDocument(input(request)) });
      } catch (error) {
        next(error);
      }
    },
  };
}
