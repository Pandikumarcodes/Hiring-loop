import { apiRequest } from '../../../shared/lib/apiClient'
import { ApiError } from '../../../shared/lib/apiErrors'
import type {
  OfferDto,
  OfferTermsInput,
  OutcomeDto,
} from '../types/offers.types'
const base = (o: string) => `/organizations/${encodeURIComponent(o)}`
const data = async <T>(
  path: string,
  options?: Parameters<typeof apiRequest>[1],
) => {
  const r = await apiRequest<{ data: T }>(path, options)
  if (!r?.data)
    throw new ApiError({
      kind: 'response',
      code: 'INVALID_API_RESPONSE',
      message: 'The server returned an invalid Phase 17 response.',
    })
  return r.data
}
export const getOffer = (o: string, a: string, signal?: AbortSignal) =>
  data<OfferDto>(`${base(o)}/applications/${encodeURIComponent(a)}/offer`, {
    signal,
  })
export const createOffer = (
  o: string,
  a: string,
  input: OfferTermsInput,
  csrf: string,
) =>
  data<OfferDto>(`${base(o)}/applications/${encodeURIComponent(a)}/offer`, {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrf },
    body: { ...input, idempotencyKey: crypto.randomUUID() },
  })
export const editOffer = (
  o: string,
  id: string,
  input: OfferTermsInput & { expectedRevision: number },
  csrf: string,
) =>
  data(`${base(o)}/offers/${encodeURIComponent(id)}/draft`, {
    method: 'PATCH',
    headers: { 'X-CSRF-Token': csrf },
    body: input as unknown as import('../../../shared/types').JsonObject,
  })
export const reviseOffer = (
  o: string,
  id: string,
  input: OfferTermsInput & { expectedRevision: number },
  csrf: string,
) =>
  data<OfferDto>(`${base(o)}/offers/${encodeURIComponent(id)}/revisions`, {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrf },
    body: input as unknown as import('../../../shared/types').JsonObject,
  })
export const sendOffer = (
  o: string,
  id: string,
  expectedRevision: number,
  key: string,
  csrf: string,
) =>
  data<{ communicationId: string; status: 'PENDING' | 'SENT' | 'FAILED' }>(
    `${base(o)}/offers/${encodeURIComponent(id)}/send`,
    {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrf },
      body: { expectedRevision, idempotencyKey: key },
    },
  )
export const transitionOffer = (
  o: string,
  id: string,
  action: 'accept' | 'decline' | 'withdraw',
  expectedRevision: number,
  csrf: string,
) =>
  data<OfferDto>(`${base(o)}/offers/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrf },
    body: { expectedRevision },
  })
export const changeOutcome = (
  o: string,
  a: string,
  action: 'hire' | 'reject' | 'reopen',
  body: Record<string, unknown>,
  csrf: string,
) =>
  data<OutcomeDto>(
    `${base(o)}/applications/${encodeURIComponent(a)}/${action}`,
    {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrf },
      body: body as import('../../../shared/types').JsonObject,
    },
  )
