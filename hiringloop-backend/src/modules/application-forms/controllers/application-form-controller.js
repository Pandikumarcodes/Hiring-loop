export function createApplicationFormController(useCases) {
  const input = (request) => ({
    organizationId: request.tenantContext.organizationId,
    jobId: request.validated.params.jobId,
  });
  const respond =
    (method, status = 200) =>
    async (request, response, next) => {
      try {
        const builder = await useCases[method]({
          ...input(request),
          ...request.validated.body,
          questionId: request.validated.params.questionId,
        });
        response.status(status).json({ data: { applicationForm: builder } });
      } catch (error) {
        next(error);
      }
    };
  return {
    get: respond('get'),
    createDraft: respond('createDraft', 201),
    addQuestion: respond('addQuestion', 201),
    updateQuestion: respond('updateQuestion'),
    deleteQuestion: respond('deleteQuestion'),
    reorderQuestions: respond('reorderQuestions'),
    publish: respond('publish'),
    discard: respond('discard'),
  };
}
