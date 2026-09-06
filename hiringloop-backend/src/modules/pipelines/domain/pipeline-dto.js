const PIPELINE_FIELDS = ['id', 'jobId', 'version', 'createdAt', 'updatedAt'];
const STAGE_FIELDS = ['id', 'name', 'kind', 'position'];

function pick(value, fields) {
  return Object.fromEntries(fields.map((field) => [field, value[field]]));
}

export const toPipelineDto = (pipeline) => ({
  ...pick(pipeline, PIPELINE_FIELDS),
  stages: pipeline.stages.map((stage) => pick(stage, STAGE_FIELDS)),
});
