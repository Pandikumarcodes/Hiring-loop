import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runAuthenticatedAuthMutation } from '../../auth/hooks/authenticated-mutation'
import {
  createOffer,
  editOffer,
  reviseOffer,
  sendOffer,
  transitionOffer,
  changeOutcome,
} from '../api/offers.api'
import { offerKeys } from './query-keys'
import { communicationKeys } from '../../communications/hooks/query-keys'
import { talentPoolKeys } from '../../talent-pools/hooks/query-keys'
import type { OfferTermsInput } from '../types/offers.types'
export function useOfferActions(o: string, a: string) {
  const c = useQueryClient()
  const refresh = () => c.invalidateQueries({ queryKey: offerKeys.offer(o, a) })
  const app = () =>
    c.invalidateQueries({ queryKey: ['candidates', o, 'application', a] })
  const secured = <T>(fn: (csrf: string) => Promise<T>) =>
    runAuthenticatedAuthMutation(c, fn)
  return {
    create: useMutation({
      mutationFn: (x: OfferTermsInput) =>
        secured((csrf) => createOffer(o, a, x, csrf)),
      onSuccess: refresh,
    }),
    edit: useMutation({
      mutationFn: (
        x: OfferTermsInput & { id: string; expectedRevision: number },
      ) => secured((csrf) => editOffer(o, x.id, x, csrf)),
      onSuccess: refresh,
    }),
    revise: useMutation({
      mutationFn: (
        x: OfferTermsInput & { id: string; expectedRevision: number },
      ) => secured((csrf) => reviseOffer(o, x.id, x, csrf)),
      onSuccess: refresh,
    }),
    send: useMutation({
      mutationFn: (x: {
        id: string
        expectedRevision: number
        idempotencyKey: string
      }) =>
        secured((csrf) =>
          sendOffer(o, x.id, x.expectedRevision, x.idempotencyKey, csrf),
        ),
      onSettled: () => {
        void refresh()
        void c.invalidateQueries({
          queryKey: communicationKeys.history(o, a, 1),
        })
      },
    }),
    transition: useMutation({
      mutationFn: (x: {
        id: string
        action: 'accept' | 'decline' | 'withdraw'
        expectedRevision: number
      }) =>
        secured((csrf) =>
          transitionOffer(o, x.id, x.action, x.expectedRevision, csrf),
        ),
      onSuccess: refresh,
    }),
    outcome: useMutation({
      mutationFn: (x: {
        action: 'hire' | 'reject' | 'reopen'
        body: Record<string, unknown>
      }) => secured((csrf) => changeOutcome(o, a, x.action, x.body, csrf)),
      onSuccess: () => {
        void app()
        void c.invalidateQueries({ queryKey: offerKeys.outcome(o, a) })
        void c.invalidateQueries({ queryKey: talentPoolKeys.all(o) })
      },
    }),
  }
}
