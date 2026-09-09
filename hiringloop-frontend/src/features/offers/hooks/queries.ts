import { queryOptions, useQuery } from '@tanstack/react-query'
import { getOffer } from '../api/offers.api'
import { offerKeys } from './query-keys'
export const offerQueryOptions = (o: string, a: string, enabled = true) =>
  queryOptions({
    queryKey: offerKeys.offer(o, a),
    queryFn: ({ signal }) => getOffer(o, a, signal),
    enabled,
    meta: { clearOnAuthChange: true },
  })
export const useOffer = (o: string, a: string, enabled = true) =>
  useQuery(offerQueryOptions(o, a, enabled))
