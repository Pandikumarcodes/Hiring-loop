export function createPublicApplicationController(publicApplicationUseCases) {
  return {
    form: async (request, response, next) => {
      try {
        const result = await publicApplicationUseCases.form(
          request.validated.params,
        );
        response.status(200).json({ data: { applicationForm: result } });
      } catch (error) {
        next(error);
      }
    },
    authorizeUpload: async (request, response, next) => {
      try {
        const result = await publicApplicationUseCases.authorizeUpload({
          ...request.validated.params,
          ...request.validated.body,
        });
        response.status(201).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
    submit: async (request, response, next) => {
      try {
        const result = await publicApplicationUseCases.submit({
          ...request.validated.params,
          ...request.validated.body,
          idempotencyKey: request.validated.headers.idempotencyKey,
        });
        response.status(201).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  };
}
