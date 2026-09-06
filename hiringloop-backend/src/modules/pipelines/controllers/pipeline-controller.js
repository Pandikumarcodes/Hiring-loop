export function createPipelineController(pipelineUseCases) {
  const input = (request) => ({
    organizationId: request.tenantContext.organizationId,
    jobId: request.validated.params.jobId,
  });
  const mutation = (request) => ({
    ...input(request),
    ...request.validated.body,
    stageId: request.validated.params.stageId,
  });
  const respond =
    (method, status = 200) =>
    async (request, response, next) => {
      try {
        response.status(status).json({
          data: {
            pipeline: await pipelineUseCases[method](mutation(request)),
          },
        });
      } catch (error) {
        next(error);
      }
    };
  return {
    get: async (request, response, next) => {
      try {
        response.status(200).json({
          data: { pipeline: await pipelineUseCases.get(input(request)) },
        });
      } catch (error) {
        next(error);
      }
    },
    createStage: respond('createStage', 201),
    renameStage: respond('renameStage'),
    reorderStages: respond('reorderStages'),
    deleteStage: respond('deleteStage'),
  };
}
