import { generateEntityId } from '../../../utils/ids.js';

// The initial published version deliberately has no recruiter-defined
// questions. Phase 12 adds candidate identity fields separately.
export function createDefaultApplicationFormData(publishedAt = new Date()) {
  const formId = generateEntityId();
  const versionId = generateEntityId();

  return {
    id: formId,
    activeVersionId: versionId,
    version: {
      id: versionId,
      versionNumber: 1,
      status: 'PUBLISHED',
      revision: 1,
      publishedAt,
    },
  };
}
