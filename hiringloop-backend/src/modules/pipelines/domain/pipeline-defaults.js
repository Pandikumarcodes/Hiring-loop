import { generateEntityId } from '../../../utils/ids.js';

const DEFAULT_STAGES = [
  ['Applied', 'ENTRY'],
  ['Screening', 'STANDARD'],
  ['Interview', 'STANDARD'],
  ['Offer', 'STANDARD'],
];

export function normalizePipelineStageName(name) {
  return name.trim().toLocaleLowerCase('en-US');
}

export function createDefaultPipelineData() {
  const id = generateEntityId();

  return {
    id,
    stages: DEFAULT_STAGES.map(([name, kind], index) => ({
      id: generateEntityId(),
      pipelineId: id,
      name,
      normalizedName: normalizePipelineStageName(name),
      kind,
      position: index + 1,
    })),
  };
}
