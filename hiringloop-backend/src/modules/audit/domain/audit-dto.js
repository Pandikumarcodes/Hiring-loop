// Audit JSON is intentionally treated as untrusted at the read boundary.  Audit
// writers are expected to store only small, safe change summaries, but this
// layer is the final protection against a legacy writer (or a directly seeded
// row) accidentally exposing private data.
const changeFields = Object.freeze({
  ORGANIZATION_CREATED: ['name', 'website'],
  ORGANIZATION_UPDATED: ['name', 'website'],
  MEMBERSHIP_ROLE_CHANGED: ['role'],
  MEMBERSHIP_REMOVED: ['role'],
  INVITATION_CREATED: ['role'],
  INVITATION_REVOKED: ['role'],
  JOB_CREATED: ['status', 'title'],
  JOB_UPDATED: ['status', 'title'],
  JOB_OPENED: ['status', 'title'],
  JOB_CLOSED: ['status', 'title'],
  JOB_REOPENED: ['status', 'title'],
  JOB_ARCHIVED: ['status', 'title'],
  PIPELINE_STAGE_CREATED: ['name', 'position'],
  PIPELINE_STAGE_UPDATED: ['name', 'position'],
  PIPELINE_REORDERED: ['position'],
  PIPELINE_STAGE_DELETED: ['name', 'position'],
  APPLICATION_FORM_PUBLISHED: ['status'],
  INTERVIEW_SCHEDULED: [
    'status',
    'scheduledStartAt',
    'scheduledEndAt',
    'participantCount',
  ],
  INTERVIEW_UPDATED: [
    'status',
    'scheduledStartAt',
    'scheduledEndAt',
    'participantCount',
  ],
  INTERVIEW_RESCHEDULED: [
    'status',
    'scheduledStartAt',
    'scheduledEndAt',
    'participantCount',
  ],
  INTERVIEW_CANCELLED: ['status'],
  SCORECARD_TEMPLATE_PUBLISHED: ['status', 'versionNumber'],
  SCORECARD_SUBMITTED: ['status'],
  OFFER_CREATED: ['status', 'versionNumber'],
  OFFER_REVISED: ['status', 'versionNumber'],
  OFFER_SENT: ['status', 'versionNumber'],
  OFFER_ACCEPTED: ['status', 'versionNumber'],
  OFFER_DECLINED: ['status', 'versionNumber'],
  OFFER_WITHDRAWN: ['status', 'versionNumber'],
  APPLICATION_HIRED: ['outcome'],
  APPLICATION_REJECTED: ['outcome', 'reasonCode'],
  APPLICATION_REOPENED: ['outcome'],
  TALENT_POOL_CREATED: ['name'],
  TALENT_POOL_UPDATED: ['name'],
});

const metadataFields = Object.freeze({
  SCORECARD_TEMPLATE_PUBLISHED: ['versionId'],
  SCORECARD_SUBMITTED: ['interviewId', 'applicationId', 'templateVersionId'],
  PIPELINE_REORDERED: ['stageCount'],
  APPLICATION_FORM_PUBLISHED: ['versionId', 'versionNumber'],
  TALENT_POOL_MEMBER_ADDED: [
    'talentPoolId',
    'candidateId',
    'hasSourceApplication',
  ],
  TALENT_POOL_MEMBER_REMOVED: ['talentPoolId', 'candidateId'],
  COMMUNICATION_SEND_REQUESTED: ['channel', 'status'],
});

const isSafeScalar = (value) =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

function allowFields(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !fields)
    return null;
  const safe = {};
  for (const field of fields)
    if (Object.hasOwn(value, field) && isSafeScalar(value[field]))
      safe[field] = value[field];
  return safe;
}

function sanitizeChange(event, value) {
  return allowFields(value, changeFields[event.action]);
}

function sanitizeMetadata(event) {
  return allowFields(event.metadata, metadataFields[event.action]);
}

export function toAuditEventDto(event) {
  return {
    id: event.id,
    actorType: event.actorType,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    before: sanitizeChange(event, event.before),
    after: sanitizeChange(event, event.after),
    metadata: sanitizeMetadata(event),
    occurredAt: event.occurredAt,
    actor: event.actor
      ? { id: event.actor.id, email: event.actor.email }
      : null,
  };
}
