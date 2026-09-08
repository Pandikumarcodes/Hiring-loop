export const scorecardTemplateKeys = {
  byJob: (o: string, j: string) => ['scorecards', 'template', o, j] as const,
}
export const scorecardKeys = {
  interviewSummary: (o: string, i: string) =>
    ['scorecards', 'summary', o, i] as const,
  mine: (o: string, i: string) => ['scorecards', 'mine', o, i] as const,
  detail: (o: string, i: string, id: string) =>
    ['scorecards', 'detail', o, i, id] as const,
  application: (o: string, a: string) =>
    ['scorecards', 'application', o, a] as const,
}
export const noteKeys = {
  application: (o: string, a: string) =>
    ['notes', 'application', o, a] as const,
}
