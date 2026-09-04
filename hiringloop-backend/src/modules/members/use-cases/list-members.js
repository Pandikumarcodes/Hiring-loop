import { toMemberDto } from '../domain/member-dto.js';

export function createListMembers({ memberRepository }) {
  return async function listMembers({ organizationId }) {
    const members = await memberRepository.listMembers({ organizationId });
    return members.map(toMemberDto);
  };
}
