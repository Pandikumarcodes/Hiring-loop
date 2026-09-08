export function createScorecardController(useCases) {
  const base = (r) => ({
    organizationId: r.tenantContext.organizationId,
    actorRole: r.tenantContext.role,
    actorUserId: r.auth.userId,
    ...r.validated.params,
    ...r.validated.body,
  });
  const respond =
    (method, key, status = 200) =>
    async (r, res, next) => {
      try {
        const value = await useCases[method](base(r));
        res.status(status).json({ data: { [key]: value } });
      } catch (e) {
        next(e);
      }
    };
  return {
    getTemplate: respond('getTemplate', 'scorecardTemplate'),
    createDraft: respond('createDraft', 'scorecardTemplate', 201),
    updateTemplate: respond('updateTemplate', 'scorecardTemplate'),
    publishTemplate: respond('publishTemplate', 'scorecardTemplate'),
    summary: respond('summary', 'scorecards'),
    my: respond('my', 'scorecard'),
    saveMy: respond('saveMy', 'scorecard'),
    submitMy: respond('submitMy', 'scorecard'),
    submitted: respond('submitted', 'scorecard'),
    application: respond('applicationScorecards', 'scorecards'),
    listNotes: respond('listNotes', 'notes'),
    createNote: respond('createNote', 'note', 201),
    updateNote: respond('updateNote', 'note'),
    deleteNote: async (r, res, next) => {
      try {
        await useCases.deleteNote(base(r));
        res.status(204).end();
      } catch (e) {
        next(e);
      }
    },
  };
}
