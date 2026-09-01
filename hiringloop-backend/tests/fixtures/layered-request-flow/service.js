import { conflictError } from '../../../src/errors/application-error.js';

export function createFoundationUseCase({ repository }) {
  return {
    execute: async ({ name }) => {
      if (name === 'conflict') {
        throw conflictError('A matching foundation fixture already exists');
      }

      if (name === 'unexpected') {
        throw new Error('fixture-only unexpected failure');
      }

      return repository.save({ name });
    },
  };
}
