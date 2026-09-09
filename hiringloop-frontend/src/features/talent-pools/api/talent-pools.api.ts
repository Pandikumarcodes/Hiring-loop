import { apiRequest } from '../../../shared/lib/apiClient'
import { ApiError } from '../../../shared/lib/apiErrors'
import type {
  TalentPoolDto,
  TalentPoolMembersDto,
  TalentPoolPageDto,
  TalentPoolMemberDto,
} from '../types/talent-pools.types'
const base = (o: string) =>
  `/organizations/${encodeURIComponent(o)}/talent-pools`
const data = async <T>(p: string, opt?: Parameters<typeof apiRequest>[1]) => {
  const r = await apiRequest<{ data: T }>(p, opt)
  if (!r?.data)
    throw new ApiError({
      kind: 'response',
      code: 'INVALID_API_RESPONSE',
      message: 'Invalid talent pool response.',
    })
  return r.data
}
export const listPools = (
  o: string,
  page = 1,
  search = '',
  signal?: AbortSignal,
) =>
  data<TalentPoolPageDto>(
    `${base(o)}?page=${page}&pageSize=25${search ? `&search=${encodeURIComponent(search)}` : ''}`,
    { signal },
  )
export const listMembers = (
  o: string,
  id: string,
  page = 1,
  search = '',
  signal?: AbortSignal,
) =>
  data<TalentPoolMembersDto>(
    `${base(o)}/${encodeURIComponent(id)}/members?page=${page}&pageSize=25${search ? `&search=${encodeURIComponent(search)}` : ''}`,
    { signal },
  )
export const createPool = (
  o: string,
  x: { name: string; description?: string },
  csrf: string,
) =>
  data<TalentPoolDto>(base(o), {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrf },
    body: x,
  })
export const updatePool = (
  o: string,
  id: string,
  x: { name: string; description?: string; expectedRevision: number },
  csrf: string,
) =>
  data<TalentPoolDto>(`${base(o)}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'X-CSRF-Token': csrf },
    body: x,
  })
export const addMember = (
  o: string,
  id: string,
  x: { candidateId: string; sourceApplicationId?: string; note?: string },
  csrf: string,
) =>
  data<TalentPoolMemberDto>(`${base(o)}/${encodeURIComponent(id)}/members`, {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrf },
    body: x,
  })
export const removeMember = (o: string, id: string, c: string, csrf: string) =>
  apiRequest(
    `${base(o)}/${encodeURIComponent(id)}/members/${encodeURIComponent(c)}`,
    { method: 'DELETE', headers: { 'X-CSRF-Token': csrf } },
  )
