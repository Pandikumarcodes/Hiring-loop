import {
  jobArchivedError,
  jobInvalidTransitionError,
  jobNotFoundError,
  jobNotReadyToOpenError,
  jobVersionConflictError,
} from '../../../errors/application-error.js';
import { generateEntityId } from '../../../utils/ids.js';
import { toJobDetailDto, toJobListDto } from '../domain/job-dto.js';

function failMutation(result, expectedVersion) {
  if (!result.current) throw jobNotFoundError();
  if (result.current.version !== expectedVersion) {
    throw jobVersionConflictError();
  }
}

function assertReadyToOpen(job) {
  const missingFields = [];
  if (!job.title?.trim()) missingFields.push('title');
  if (!job.employmentType) missingFields.push('employmentType');
  if (!job.workplaceType) missingFields.push('workplaceType');
  if (!job.description?.trim()) missingFields.push('description');
  if (!Number.isInteger(job.openings) || job.openings < 1) {
    missingFields.push('openings');
  }
  if (
    ['ONSITE', 'HYBRID'].includes(job.workplaceType) &&
    !job.location?.trim()
  ) {
    missingFields.push('location');
  }
  if (missingFields.length > 0) {
    throw jobNotReadyToOpenError({ missingFields });
  }
}

export function createJobUseCases({ jobRepository, clock = () => new Date() }) {
  const get = async ({ organizationId, jobId }) => {
    const job = await jobRepository.findByIdForOrganization({
      organizationId,
      jobId,
    });
    if (!job) throw jobNotFoundError();
    return job;
  };

  async function transition({
    organizationId,
    jobId,
    expectedVersion,
    from,
    operation,
    data,
    checkReadiness = false,
  }) {
    const current = await get({ organizationId, jobId });
    if (current.version !== expectedVersion) throw jobVersionConflictError();
    if (current.status !== from) {
      throw jobInvalidTransitionError({
        operation,
        currentStatus: current.status,
      });
    }
    if (checkReadiness) assertReadyToOpen(current);
    const result = await jobRepository.mutate({
      organizationId,
      jobId,
      expectedVersion,
      status: from,
      data,
    });
    if (result.outcome !== 'updated') {
      failMutation(result, expectedVersion);
      throw jobInvalidTransitionError({
        operation,
        currentStatus: result.current.status,
      });
    }
    return toJobDetailDto(result.job);
  }

  return {
    create: async ({ organizationId, data }) =>
      toJobDetailDto(
        await jobRepository.create({
          organizationId,
          id: generateEntityId(),
          data,
        }),
      ),
    list: async (input) => {
      const result = await jobRepository.list(input);
      return {
        jobs: result.jobs.map(toJobListDto),
        pagination: {
          page: input.page,
          limit: input.limit,
          totalItems: result.totalItems,
          totalPages: Math.ceil(result.totalItems / input.limit),
        },
      };
    },
    detail: async (input) => toJobDetailDto(await get(input)),
    update: async ({ organizationId, jobId, expectedVersion, data }) => {
      const current = await get({ organizationId, jobId });
      if (current.version !== expectedVersion) throw jobVersionConflictError();
      if (current.status === 'ARCHIVED') throw jobArchivedError();
      const result = await jobRepository.mutate({
        organizationId,
        jobId,
        expectedVersion,
        status: { not: 'ARCHIVED' },
        data,
      });
      if (result.outcome !== 'updated') {
        failMutation(result, expectedVersion);
        if (result.current.status === 'ARCHIVED') throw jobArchivedError();
      }
      return toJobDetailDto(result.job);
    },
    open: (input) =>
      transition({
        ...input,
        from: 'DRAFT',
        operation: 'open',
        checkReadiness: true,
        data: {
          status: 'OPEN',
          openedAt: clock(),
          closedAt: null,
          archivedAt: null,
        },
      }),
    close: (input) =>
      transition({
        ...input,
        from: 'OPEN',
        operation: 'close',
        data: { status: 'CLOSED', closedAt: clock() },
      }),
    reopen: (input) =>
      transition({
        ...input,
        from: 'CLOSED',
        operation: 'reopen',
        checkReadiness: true,
        data: { status: 'OPEN', openedAt: clock(), closedAt: null },
      }),
    archive: async (input) => {
      const current = await get(input);
      if (current.version !== input.expectedVersion) {
        throw jobVersionConflictError();
      }
      if (!['DRAFT', 'CLOSED'].includes(current.status)) {
        throw jobInvalidTransitionError({
          operation: 'archive',
          currentStatus: current.status,
        });
      }
      const result = await jobRepository.mutate({
        ...input,
        status: current.status,
        data: { status: 'ARCHIVED', archivedAt: clock() },
      });
      if (result.outcome !== 'updated') {
        failMutation(result, input.expectedVersion);
        throw jobInvalidTransitionError({
          operation: 'archive',
          currentStatus: result.current.status,
        });
      }
      return toJobDetailDto(result.job);
    },
  };
}
