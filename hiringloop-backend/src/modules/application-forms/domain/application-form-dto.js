const option = ({ id, label, value, sortOrder }) => ({
  id,
  label,
  value,
  sortOrder,
});
const question = ({
  id,
  questionKey,
  type,
  label,
  description,
  placeholder,
  required,
  sortOrder,
  options,
}) => ({
  id,
  questionKey,
  type,
  label,
  description,
  placeholder,
  required,
  sortOrder,
  options: options.map(option),
});
const version = (item) =>
  item && {
    id: item.id,
    versionNumber: item.versionNumber,
    status: item.status,
    revision: item.revision,
    publishedAt: item.publishedAt,
    questions: item.questions.map(question),
  };
export const toApplicationFormBuilderDto = (form) => ({
  id: form.id,
  jobId: form.jobId,
  activeVersion: version(form.activeVersion),
  draft: version(form.versions.find((item) => item.status === 'DRAFT') ?? null),
});
