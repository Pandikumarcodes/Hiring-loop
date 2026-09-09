import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runAuthenticatedAuthMutation } from '../../auth/hooks/authenticated-mutation'
import {
  addMember,
  createPool,
  removeMember,
  updatePool,
} from '../api/talent-pools.api'
import { talentPoolKeys } from './query-keys'
export function useTalentPoolActions(o: string) {
  const c = useQueryClient()
  const pools = () => c.invalidateQueries({ queryKey: talentPoolKeys.all(o) })
  return {
    create: useMutation({
      mutationFn: (x: { name: string; description?: string }) =>
        runAuthenticatedAuthMutation(c, (csrf) => createPool(o, x, csrf)),
      onSuccess: pools,
    }),
    update: useMutation({
      mutationFn: (x: {
        id: string
        name: string
        description?: string
        expectedRevision: number
      }) =>
        runAuthenticatedAuthMutation(c, (csrf) => updatePool(o, x.id, x, csrf)),
      onSuccess: pools,
    }),
    add: useMutation({
      mutationFn: (x: {
        poolId: string
        candidateId: string
        sourceApplicationId?: string
      }) =>
        runAuthenticatedAuthMutation(c, (csrf) =>
          addMember(o, x.poolId, x, csrf),
        ),
      onSuccess: pools,
    }),
    remove: useMutation({
      mutationFn: (x: { poolId: string; candidateId: string }) =>
        runAuthenticatedAuthMutation(c, (csrf) =>
          removeMember(o, x.poolId, x.candidateId, csrf),
        ),
      onSuccess: pools,
    }),
  }
}
