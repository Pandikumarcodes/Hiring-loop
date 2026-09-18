export function createAnalyticsController(useCases) {
  const handler = (name) => async (req, res, next) => {
    try {
      res.json({
        data: await useCases[name]({
          organizationId: req.tenantContext.organizationId,
          ...req.validated.query,
        }),
      });
    } catch (error) {
      next(error);
    }
  };
  return {
    overview: handler('overview'),
    funnel: handler('funnel'),
    pipeline: handler('pipeline'),
    interviews: handler('interviews'),
    communications: handler('communications'),
    outcomes: handler('outcomes'),
    jobs: handler('jobs'),
  };
}
