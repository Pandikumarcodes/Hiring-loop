export function createPublicCareerController(publicCareerUseCases) {
  return {
    list: async (request, response, next) => {
      try {
        const result = await publicCareerUseCases.list({
          organizationSlug: request.validated.params.organizationSlug,
          ...request.validated.query,
        });
        response.status(200).json({
          data: { organization: result.organization, jobs: result.jobs },
          pagination: result.pagination,
        });
      } catch (error) {
        next(error);
      }
    },
    detail: async (request, response, next) => {
      try {
        const result = await publicCareerUseCases.detail({
          organizationSlug: request.validated.params.organizationSlug,
          jobId: request.validated.params.jobId,
        });
        response.status(200).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  };
}
