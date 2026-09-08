const APPROVED_ROLES = Object.freeze([
  'ADMIN',
  'RECRUITER',
  'HIRING_MANAGER',
  'INTERVIEWER',
]);

export const ORGANIZATION_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  RECRUITER: 'RECRUITER',
  HIRING_MANAGER: 'HIRING_MANAGER',
  INTERVIEWER: 'INTERVIEWER',
});

export const PERMISSIONS = Object.freeze({
  MEMBER_READ: 'member:read',
  MEMBER_INVITE: 'member:invite',
  MEMBER_ROLE_CHANGE: 'member:role-change',
  MEMBER_REMOVE: 'member:remove',
  INVITATION_READ: 'invitation:read',
  INVITATION_REVOKE: 'invitation:revoke',
  JOB_LIST: 'job:list',
  JOB_READ: 'job:read',
  JOB_CREATE: 'job:create',
  JOB_UPDATE: 'job:update',
  JOB_OPEN: 'job:open',
  JOB_CLOSE: 'job:close',
  JOB_REOPEN: 'job:reopen',
  JOB_ARCHIVE: 'job:archive',
  PIPELINE_VIEW: 'pipeline:view',
  PIPELINE_CONFIGURE: 'pipeline:configure',
  APPLICATION_FORM_VIEW: 'application-form:view',
  APPLICATION_FORM_CONFIGURE: 'application-form:configure',
  CANDIDATE_LIST: 'candidate:list',
  CANDIDATE_READ: 'candidate:read',
  CANDIDATE_DOCUMENT_ACCESS: 'candidate-document:access',
  INTERVIEW_CREATE: 'interview:create',
  INTERVIEW_VIEW: 'interview:view',
  INTERVIEW_VIEW_ASSIGNED: 'interview:view-assigned',
  INTERVIEW_UPDATE: 'interview:update',
  INTERVIEW_RESCHEDULE: 'interview:reschedule',
  INTERVIEW_CANCEL: 'interview:cancel',
});

const ADMIN_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));
const JOB_MANAGER_PERMISSIONS = Object.freeze([
  PERMISSIONS.JOB_LIST,
  PERMISSIONS.JOB_READ,
  PERMISSIONS.JOB_CREATE,
  PERMISSIONS.JOB_UPDATE,
  PERMISSIONS.JOB_OPEN,
  PERMISSIONS.JOB_CLOSE,
  PERMISSIONS.JOB_REOPEN,
  PERMISSIONS.PIPELINE_VIEW,
]);

// Keep this matrix in application code until product and security decisions
// justify database-backed permissions.
export const ROLE_PERMISSIONS = Object.freeze({
  ADMIN: ADMIN_PERMISSIONS,
  RECRUITER: Object.freeze([
    ...JOB_MANAGER_PERMISSIONS,
    PERMISSIONS.JOB_ARCHIVE,
    PERMISSIONS.PIPELINE_CONFIGURE,
    PERMISSIONS.APPLICATION_FORM_VIEW,
    PERMISSIONS.APPLICATION_FORM_CONFIGURE,
    PERMISSIONS.CANDIDATE_LIST,
    PERMISSIONS.CANDIDATE_READ,
    PERMISSIONS.CANDIDATE_DOCUMENT_ACCESS,
    PERMISSIONS.INTERVIEW_CREATE,
    PERMISSIONS.INTERVIEW_VIEW,
    PERMISSIONS.INTERVIEW_VIEW_ASSIGNED,
    PERMISSIONS.INTERVIEW_UPDATE,
    PERMISSIONS.INTERVIEW_RESCHEDULE,
    PERMISSIONS.INTERVIEW_CANCEL,
  ]),
  // Hiring Managers retain the same read scope as JOB_READ: they can inspect
  // a job's current application configuration, but cannot configure it.
  HIRING_MANAGER: Object.freeze([
    ...JOB_MANAGER_PERMISSIONS,
    PERMISSIONS.APPLICATION_FORM_VIEW,
    PERMISSIONS.INTERVIEW_VIEW,
    PERMISSIONS.INTERVIEW_VIEW_ASSIGNED,
  ]),
  INTERVIEWER: Object.freeze([PERMISSIONS.INTERVIEW_VIEW_ASSIGNED]),
});

const KNOWN_PERMISSIONS = new Set(Object.values(PERMISSIONS));

export function hasPermission({ role, permission } = {}) {
  if (!APPROVED_ROLES.includes(role) || !KNOWN_PERMISSIONS.has(permission)) {
    return false;
  }

  return ROLE_PERMISSIONS[role].includes(permission);
}
