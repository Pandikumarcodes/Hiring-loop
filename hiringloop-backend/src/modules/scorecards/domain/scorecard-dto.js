const criterion = ({ id, label, description, type, required, position }) => ({
  id,
  label,
  description,
  type,
  required,
  position,
});
const version = (v) =>
  v && {
    id: v.id,
    versionNumber: v.versionNumber,
    status: v.status,
    title: v.title,
    instructions: v.instructions,
    revision: v.revision,
    publishedAt: v.publishedAt,
    criteria: (v.criteria || []).map(criterion),
  };
export const toTemplateDto = (t) =>
  t && {
    id: t.id,
    jobId: t.jobId,
    activeVersion: version(t.activeVersion),
    draft: version(t.versions?.find((v) => v.status === 'DRAFT')),
  };
export const toMyScorecardDto = ({
  interview,
  participant,
  scorecard,
  templateVersion,
}) => ({
  id: scorecard?.id ?? null,
  interviewId: interview.id,
  interviewParticipantId: participant.id,
  status: scorecard?.status ?? 'NOT_STARTED',
  revision: scorecard?.revision ?? null,
  templateVersion: version(scorecard?.templateVersion ?? templateVersion),
  responses: (scorecard?.responses ?? []).map(
    ({ criterionId, ratingValue, textValue, comment }) => ({
      criterionId,
      ratingValue,
      textValue,
      comment,
    }),
  ),
  overallRecommendation: scorecard?.overallRecommendation ?? null,
  overallComment: scorecard?.overallComment ?? null,
  submittedAt: scorecard?.submittedAt ?? null,
});
export const toSummaryDto = (s) => ({
  id: s.id,
  participant: {
    id: s.participant.id,
    user: { id: s.participant.user.id },
  },
  status: s.status,
  submittedAt: s.submittedAt,
  overallRecommendation:
    s.status === 'SUBMITTED' ? s.overallRecommendation : null,
});
export const toSubmittedDto = (s) => ({
  ...toSummaryDto(s),
  templateVersion: version(s.templateVersion),
  responses: s.responses.map(
    ({ criterionId, ratingValue, textValue, comment }) => ({
      criterionId,
      ratingValue,
      textValue,
      comment,
    }),
  ),
  overallComment: s.overallComment,
});
export const toNoteDto = (n) => ({
  id: n.id,
  applicationId: n.applicationId,
  author: { id: n.author.id },
  body: n.body,
  revision: n.revision,
  createdAt: n.createdAt,
  updatedAt: n.updatedAt,
});
