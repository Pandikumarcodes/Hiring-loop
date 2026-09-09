import { useQuery, queryOptions } from '@tanstack/react-query'
import { listMembers, listPools } from '../api/talent-pools.api'
import { talentPoolKeys } from './query-keys'
export const usePools = (o: string, page = 1, search = '', enabled = true) =>
  useQuery(
    queryOptions({
      queryKey: talentPoolKeys.list(o, page, search),
      queryFn: ({ signal }) => listPools(o, page, search, signal),
      enabled,
      placeholderData: (x) => x,
      meta: { clearOnAuthChange: true },
    }),
  )
export const usePoolMembers = (
  o: string,
  id: string,
  page = 1,
  search = '',
  enabled = true,
) =>
  useQuery(
    queryOptions({
      queryKey: talentPoolKeys.members(o, id, page, search),
      queryFn: ({ signal }) => listMembers(o, id, page, search, signal),
      enabled,
      placeholderData: (x) => x,
      meta: { clearOnAuthChange: true },
    }),
  )
