import { ApplicationError } from '../../../errors/application-error.js';
import { toOutcomeDto } from '../domain/outcome-dto.js';
const fail = (status, code, message) =>
  new ApplicationError({ status, code, message });
export function createApplicationOutcomeUseCases({ outcomeRepository }) {
  async function change({
    organizationId,
    applicationId,
    actorUserId,
    data,
    type,
  }) {
    const application = await outcomeRepository.find({
      organizationId,
      applicationId,
    });
    if (!application)
      throw fail(404, 'APPLICATION_NOT_FOUND', 'Application not found');
    if (
      type === 'HIRED' &&
      !(await outcomeRepository.findAcceptedOffer({
        organizationId,
        applicationId,
      }))
    )
      throw fail(
        409,
        'APPLICATION_HIRE_REQUIRES_ACCEPTED_OFFER',
        'Hiring requires an accepted offer',
      );
    const rule =
      type === 'REOPENED'
        ? { from: ['HIRED', 'REJECTED'], to: 'ACTIVE' }
        : { from: ['ACTIVE'], to: type };
    const result = await outcomeRepository.transition({
      organizationId,
      applicationId,
      actorUserId,
      expectedRevision: data.expectedRevision,
      from: rule.from,
      to: rule.to,
      reasonCode: type === 'REJECTED' ? data.reasonCode : null,
      reasonDetails: data.reasonDetails ?? null,
      talentPoolId: type === 'REJECTED' ? data.talentPoolId : undefined,
    });
    if (result.outcome === 'pool_missing')
      throw fail(404, 'TALENT_POOL_NOT_FOUND', 'Talent pool not found');
    if (result.outcome !== 'changed')
      throw fail(
        409,
        'APPLICATION_OUTCOME_CONFLICT',
        'Application outcome changed',
      );
    return toOutcomeDto(
      result.application,
      await outcomeRepository.history({ organizationId, applicationId }),
    );
  }
  return {
    hire: (input) => change({ ...input, type: 'HIRED' }),
    reject: (input) => change({ ...input, type: 'REJECTED' }),
    reopen: (input) => change({ ...input, type: 'REOPENED' }),
  };
}
