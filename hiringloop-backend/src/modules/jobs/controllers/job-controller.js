export function createJobController(jobUseCases) {
  const input = (request) => ({
    organizationId: request.tenantContext.organizationId,
    jobId: request.validated.params?.jobId,
  });
  const mutation = (request) => ({
    ...input(request),
    expectedVersion: request.validated.body.expectedVersion,
  });
  return {
    create: async (request, response, next) => {
      try {
        const job = await jobUseCases.create({
          organizationId: request.tenantContext.organizationId,
          data: request.validated.body,
        });
        response.status(201).json({ data: { job } });
      } catch (error) {
        next(error);
      }
    },
    list: async (request, response, next) => {
      try {
        const result = await jobUseCases.list({
          organizationId: request.tenantContext.organizationId,
          ...request.validated.query,
        });
        response.status(200).json({
          data: { jobs: result.jobs },
          pagination: result.pagination,
        });
      } catch (error) {
        next(error);
      }
    },
    detail: async (request, response, next) => {
      try {
        response
          .status(200)
          .json({ data: { job: await jobUseCases.detail(input(request)) } });
      } catch (error) {
        next(error);
      }
    },
    update: async (request, response, next) => {
      try {
        const { expectedVersion, ...data } = request.validated.body;
        const job = await jobUseCases.update({
          ...input(request),
          expectedVersion,
          data,
        });
        response.status(200).json({ data: { job } });
      } catch (error) {
        next(error);
      }
    },
    open: action('open'),
    close: action('close'),
    reopen: action('reopen'),
    archive: action('archive'),
  };

  function action(name) {
    return async (request, response, next) => {
      try {
        const job = await jobUseCases[name](mutation(request));
        response.status(200).json({ data: { job } });
      } catch (error) {
        next(error);
      }
    };
  }
}
