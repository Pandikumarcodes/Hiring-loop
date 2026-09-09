import { ApplicationError } from '../../../errors/application-error.js';
import { generateEntityId } from '../../../utils/ids.js';
import {
  toTalentPoolDto,
  toTalentPoolMemberDto,
} from '../domain/talent-pool-dto.js';
const fail = (status, code, message) =>
  new ApplicationError({ status, code, message });
export function createTalentPoolUseCases({ repository }) {
  return {
    async list(input) {
      const result = await repository.list(input);
      return {
        pools: result.pools.map(toTalentPoolDto),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          totalItems: result.totalItems,
        },
      };
    },
    async create({ organizationId, actorUserId, data }) {
      try {
        return toTalentPoolDto(
          await repository.create({
            id: generateEntityId(),
            organizationId,
            actorUserId,
            data,
          }),
        );
      } catch (error) {
        if (error?.code === 'P2002')
          throw fail(
            409,
            'TALENT_POOL_CONFLICT',
            'Talent pool name already exists',
          );
        throw error;
      }
    },
    async update({ organizationId, talentPoolId, data }) {
      const changed = await repository.update({
        organizationId,
        talentPoolId,
        data,
      });
      if (!changed.count) {
        if (!(await repository.find({ organizationId, talentPoolId })))
          throw fail(404, 'TALENT_POOL_NOT_FOUND', 'Talent pool not found');
        throw fail(
          409,
          'TALENT_POOL_CONFLICT',
          'Talent pool revision is stale',
        );
      }
      return toTalentPoolDto(
        await repository.find({ organizationId, talentPoolId }),
      );
    },
    async listMembers({ organizationId, talentPoolId, ...query }) {
      if (!(await repository.find({ organizationId, talentPoolId })))
        throw fail(404, 'TALENT_POOL_NOT_FOUND', 'Talent pool not found');
      return {
        members: (
          await repository.listMembers({
            organizationId,
            talentPoolId,
            ...query,
          })
        ).map(toTalentPoolMemberDto),
        pagination: { page: query.page, pageSize: query.pageSize },
      };
    },
    async addMember({ organizationId, talentPoolId, actorUserId, data }) {
      if (!(await repository.find({ organizationId, talentPoolId })))
        throw fail(404, 'TALENT_POOL_NOT_FOUND', 'Talent pool not found');
      if (
        !(await repository.candidate({
          organizationId,
          candidateId: data.candidateId,
        }))
      )
        throw fail(
          404,
          'TALENT_POOL_NOT_FOUND',
          'Talent pool or candidate not found',
        );
      if (
        data.sourceApplicationId &&
        !(await repository.sourceApplication({
          organizationId,
          sourceApplicationId: data.sourceApplicationId,
          candidateId: data.candidateId,
        }))
      )
        throw fail(
          400,
          'VALIDATION_ERROR',
          'Source application does not match candidate',
        );
      return toTalentPoolMemberDto(
        await repository.addMember({
          id: generateEntityId(),
          organizationId,
          talentPoolId,
          actorUserId,
          data,
        }),
      );
    },
    async removeMember({ organizationId, talentPoolId, candidateId }) {
      const deleted = await repository.removeMember({
        organizationId,
        talentPoolId,
        candidateId,
      });
      if (!deleted.count)
        throw fail(
          404,
          'TALENT_POOL_NOT_FOUND',
          'Talent pool member not found',
        );
    },
  };
}
