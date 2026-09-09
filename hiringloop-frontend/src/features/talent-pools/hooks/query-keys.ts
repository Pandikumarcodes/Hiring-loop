export const talentPoolKeys = {
  all: (o: string) => ['talent-pools', o] as const,
  list: (o: string, page: number, search: string) =>
    ['talent-pools', o, 'list', page, search] as const,
  members: (o: string, id: string, page: number, search: string) =>
    ['talent-pools', o, id, 'members', page, search] as const,
}
