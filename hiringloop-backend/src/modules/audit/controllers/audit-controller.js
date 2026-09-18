export function createAuditController(useCases) {
  return {
    list: async (req, res, next) => {
      try {
        res.json({
          data: await useCases.list({
            organizationId: req.tenantContext.organizationId,
            ...req.validated.query,
          }),
        });
      } catch (error) {
        next(error);
      }
    },
    get: async (req, res, next) => {
      try {
        res.json({
          data: await useCases.get({
            organizationId: req.tenantContext.organizationId,
            auditEventId: req.validated.params.auditEventId,
          }),
        });
      } catch (error) {
        next(error);
      }
    },
  };
}
