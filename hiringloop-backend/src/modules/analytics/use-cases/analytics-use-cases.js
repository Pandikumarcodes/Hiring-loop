import { ApplicationError } from '../../../errors/application-error.js';
const defaultRange = (clock) => {
  const to = clock();
  return { from: new Date(to.getTime() - 30 * 86400000), to };
};
export function createAnalyticsUseCases({
  repository,
  clock = () => new Date(),
}) {
  const input = async (value) => {
    const dates =
      value.from && value.to
        ? { from: value.from, to: value.to }
        : defaultRange(clock);
    if (value.jobId && !(await repository.assertJob(value)))
      throw new ApplicationError({
        status: 404,
        code: 'JOB_NOT_FOUND',
        message: 'Job not found',
      });
    return { ...value, ...dates, now: clock() };
  };
  return {
    overview: async (value) => repository.overview(await input(value)),
    funnel: async (value) => repository.funnel(await input(value)),
    pipeline: async (value) => repository.pipeline(await input(value)),
    interviews: async (value) => repository.interviews(await input(value)),
    communications: async (value) =>
      repository.communications(await input(value)),
    outcomes: async (value) => repository.outcomes(await input(value)),
    jobs: async (value) => repository.jobs(await input(value)),
  };
}
