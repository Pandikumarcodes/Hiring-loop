import {
  pipelineDuplicateNameError,
  pipelineEntryDeleteError,
  pipelineEntryMoveError,
  pipelineInvalidOrderError,
  pipelineJobLockedError,
  pipelineNotFoundError,
  pipelineStageLimitError,
  pipelineStageNotFoundError,
  pipelineVersionConflictError,
} from '../../../errors/application-error.js';
import { generateEntityId } from '../../../utils/ids.js';
import { normalizePipelineStageName } from '../domain/pipeline-defaults.js';
import { toPipelineDto } from '../domain/pipeline-dto.js';

const MAX_STAGES = 20;

function assertMutation(result) {
  if (result.outcome === 'not_found') throw pipelineNotFoundError();
  if (result.outcome === 'lifecycle')
    throw pipelineJobLockedError({ status: result.status });
  if (result.outcome === 'conflict') throw pipelineVersionConflictError();
}

function stageFor(pipeline, stageId) {
  const stage = pipeline.stages.find((item) => item.id === stageId);
  if (!stage) throw pipelineStageNotFoundError();
  return stage;
}

function assertNameAvailable(pipeline, normalizedName, exceptId) {
  if (
    pipeline.stages.some(
      (stage) =>
        stage.id !== exceptId && stage.normalizedName === normalizedName,
    )
  ) {
    throw pipelineDuplicateNameError();
  }
}

export function createPipelineUseCases({ pipelineRepository }) {
  const get = async (input) => {
    const pipeline = await pipelineRepository.findForJob(input);
    if (!pipeline) throw pipelineNotFoundError();
    return pipeline;
  };
  const mutation = async (input, prepare) => {
    const current = await get(input);
    if (current.version !== input.expectedVersion)
      throw pipelineVersionConflictError();
    const apply = prepare(current);
    const result = await pipelineRepository.mutate({ ...input, apply });
    assertMutation(result);
    return toPipelineDto(result.pipeline);
  };

  return {
    get: async (input) => toPipelineDto(await get(input)),
    createStage: (input) =>
      mutation(input, (pipeline) => {
        if (pipeline.stages.length >= MAX_STAGES)
          throw pipelineStageLimitError();
        const name = input.name.trim();
        const normalizedName = normalizePipelineStageName(name);
        assertNameAvailable(pipeline, normalizedName);
        return (transaction) =>
          transaction.pipelineStage.create({
            data: {
              id: generateEntityId(),
              pipelineId: pipeline.id,
              name,
              normalizedName,
              kind: 'STANDARD',
              position: pipeline.stages.length + 1,
            },
          });
      }),
    renameStage: (input) =>
      mutation(input, (pipeline) => {
        const stage = stageFor(pipeline, input.stageId);
        const name = input.name.trim();
        const normalizedName = normalizePipelineStageName(name);
        assertNameAvailable(pipeline, normalizedName, stage.id);
        return (transaction) =>
          transaction.pipelineStage.update({
            where: { id: stage.id, pipelineId: pipeline.id },
            data: { name, normalizedName },
          });
      }),
    reorderStages: (input) =>
      mutation(input, (pipeline) => {
        const currentIds = pipeline.stages.map((stage) => stage.id);
        const requested = input.stageIds;
        if (
          new Set(requested).size !== requested.length ||
          requested.length !== currentIds.length ||
          requested.some((id) => !currentIds.includes(id))
        ) {
          throw pipelineInvalidOrderError();
        }
        const entry = pipeline.stages.find((stage) => stage.kind === 'ENTRY');
        if (requested[0] !== entry.id) throw pipelineEntryMoveError();
        return async (transaction) => {
          // Shift all rows out of the final 1..N range before final assignments.
          await transaction.pipelineStage.updateMany({
            where: { pipelineId: pipeline.id },
            data: { position: { increment: MAX_STAGES } },
          });
          await Promise.all(
            requested.map((id, index) =>
              transaction.pipelineStage.update({
                where: { id, pipelineId: pipeline.id },
                data: { position: index + 1 },
              }),
            ),
          );
        };
      }),
    deleteStage: (input) =>
      mutation(input, (pipeline) => {
        const stage = stageFor(pipeline, input.stageId);
        if (stage.kind === 'ENTRY') throw pipelineEntryDeleteError();
        return async (transaction) => {
          await transaction.pipelineStage.delete({
            where: { id: stage.id, pipelineId: pipeline.id },
          });
          // Compact safely through an unused temporary position range.
          await transaction.pipelineStage.updateMany({
            where: { pipelineId: pipeline.id },
            data: { position: { increment: MAX_STAGES } },
          });
          const remaining = pipeline.stages
            .filter((item) => item.id !== stage.id)
            .sort((a, b) => a.position - b.position);
          await Promise.all(
            remaining.map((item, index) =>
              transaction.pipelineStage.update({
                where: { id: item.id, pipelineId: pipeline.id },
                data: { position: index + 1 },
              }),
            ),
          );
        };
      }),
  };
}
