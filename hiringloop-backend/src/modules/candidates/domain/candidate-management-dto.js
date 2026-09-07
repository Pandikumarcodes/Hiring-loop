function name(candidate) {
  return `${candidate.firstName} ${candidate.lastName}`.trim();
}

const stage = (item) => item && { id: item.id, name: item.name };

const applicationSummary = (application) => ({
  id: application.id,
  job: { id: application.job.id, title: application.job.title },
  currentStage: stage(application.currentStage),
  submittedAt: application.submittedAt,
});

function selectedOptions(answer) {
  const options = answer.question.options;
  const value = answer.value;
  const ids =
    answer.question.type === 'SINGLE_SELECT'
      ? [value?.optionId]
      : answer.question.type === 'MULTI_SELECT'
        ? value?.optionIds
        : [];
  if (!Array.isArray(ids)) return [];
  return ids
    .map((id) => options.find((option) => option.id === id))
    .filter(Boolean)
    .map((option) => ({ id: option.id, label: option.label }));
}

export const toCandidateListItemDto = (item) => ({
  id: item.candidateId,
  name: item.name,
  email: item.email,
  applicationCount: Number(item.applicationCount),
  latestApplication: item.applicationId
    ? {
        id: item.applicationId,
        job: { id: item.jobId, title: item.jobTitle },
        currentStage: { id: item.stageId, name: item.stageName },
        submittedAt: item.submittedAt,
      }
    : null,
});

export const toCandidateDetailDto = (candidate) => ({
  id: candidate.id,
  name: name(candidate),
  email: candidate.email,
  phone: candidate.phone,
  createdAt: candidate.createdAt,
  applications: candidate.applications.map(applicationSummary),
});

export const toApplicationDetailDto = (application) => ({
  id: application.id,
  submittedAt: application.submittedAt,
  formVersionId: application.applicationFormVersionId,
  candidate: {
    id: application.candidate.id,
    name: name(application.candidate),
    email: application.candidate.email,
    phone: application.candidate.phone,
  },
  job: { id: application.job.id, title: application.job.title },
  currentStage: stage(application.currentStage),
  answers: application.answers
    .sort((a, b) => a.question.sortOrder - b.question.sortOrder)
    .map((answer) => ({
      question: {
        id: answer.question.id,
        type: answer.question.type,
        label: answer.question.label,
        description: answer.question.description,
        required: answer.question.required,
        sortOrder: answer.question.sortOrder,
      },
      value: answer.value,
      selectedOptions: selectedOptions(answer),
    })),
  documents: application.documents.map((document) => ({
    id: document.id,
    fileName: document.originalFilename,
    contentType: document.mimeType,
    type: document.type,
    createdAt: document.createdAt,
  })),
  stageHistory: application.stageHistory.map((entry) => ({
    id: entry.id,
    event: entry.event,
    occurredAt: entry.occurredAt,
    fromStage: stage(entry.fromStage),
    toStage: stage(entry.toStage),
  })),
});
