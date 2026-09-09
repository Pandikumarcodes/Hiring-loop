export const toOutcomeDto = (application, events = []) => ({
  applicationId: application.id,
  outcome: application.outcome,
  outcomeRevision: application.outcomeRevision,
  outcomeUpdatedAt: application.outcomeUpdatedAt,
  history: events.map((event) => ({
    id: event.id,
    type: event.type,
    reasonCode: event.reasonCode,
    reasonDetails: event.reasonDetails,
    occurredAt: event.occurredAt,
  })),
});
