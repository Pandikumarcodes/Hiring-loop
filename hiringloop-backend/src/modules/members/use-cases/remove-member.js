import {
  conflictError,
  notFoundError,
} from '../../../errors/application-error.js';

export function createRemoveMember({ memberRepository }) {
  return async function removeMember({ organizationId, membershipId }) {
    let result;
    try {
      result = await memberRepository.removeMembership({
        organizationId,
        membershipId,
      });
    } catch (error) {
      if (error?.code === 'P2003') {
        throw conflictError(
          'This member cannot be removed while referenced invitation history remains',
        );
      }
      throw error;
    }
    if (result.outcome === 'missing') throw notFoundError();
    if (result.outcome === 'final_admin') {
      throw conflictError('The organization must retain at least one Admin');
    }
    return { removed: true, membershipId };
  };
}
