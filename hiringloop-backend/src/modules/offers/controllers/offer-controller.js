export function createOfferController(offerUseCases) {
  const scope = (request) => ({
    organizationId: request.tenantContext.organizationId,
    offerId: request.validated.params.offerId,
    applicationId: request.validated.params.applicationId,
    actorUserId: request.auth.userId,
  });
  const handle =
    (operation, status = 200) =>
    async (request, response, next) => {
      try {
        response.status(status).json({
          data: await offerUseCases[operation]({
            ...scope(request),
            data: request.validated.body,
          }),
        });
      } catch (error) {
        next(error);
      }
    };
  return {
    byApplication: handle('get'),
    byId: handle('get'),
    create: handle('create', 201),
    editDraft: handle('editDraft'),
    revise: handle('revise', 201),
    send: async (request, response, next) => {
      try {
        const result = await offerUseCases.send({
          ...scope(request),
          data: request.validated.body,
        });
        response
          .status(result.unconfirmed ? 202 : result.retrySafe ? 200 : 201)
          .json({ data: result });
      } catch (error) {
        next(error);
      }
    },
    accept: async (request, response, next) => {
      try {
        response.json({
          data: await offerUseCases.transition({
            ...scope(request),
            expectedRevision: request.validated.body.expectedRevision,
            operation: 'accept',
          }),
        });
      } catch (error) {
        next(error);
      }
    },
    decline: async (request, response, next) => {
      try {
        response.json({
          data: await offerUseCases.transition({
            ...scope(request),
            expectedRevision: request.validated.body.expectedRevision,
            operation: 'decline',
          }),
        });
      } catch (error) {
        next(error);
      }
    },
    withdraw: async (request, response, next) => {
      try {
        response.json({
          data: await offerUseCases.transition({
            ...scope(request),
            expectedRevision: request.validated.body.expectedRevision,
            operation: 'withdraw',
          }),
        });
      } catch (error) {
        next(error);
      }
    },
  };
}
