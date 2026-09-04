import {
  conflictError,
  notFoundError,
} from '../../../errors/application-error.js';
import { toMemberDto } from '../domain/member-dto.js';

export function createUpdateMemberRole({ memberRepository }) {
  return async function updateMemberRole({
    organizationId,
    membershipId,
    role,
  }) {
    const result = await memberRepository.updateMembershipRole({
      organizationId,
      membershipId,
      role,
    });
    if (result.outcome === 'missing') throw notFoundError();
    if (result.outcome === 'final_admin') {
      throw conflictError('The organization must retain at least one Admin');
    }
    return toMemberDto(result.membership);
  };
}
