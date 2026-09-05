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
]);

// Keep this matrix in application code until product and security decisions
// justify database-backed permissions.
export const ROLE_PERMISSIONS = Object.freeze({
  ADMIN: ADMIN_PERMISSIONS,
  RECRUITER: Object.freeze([
    ...JOB_MANAGER_PERMISSIONS,
    PERMISSIONS.JOB_ARCHIVE,
  ]),
  HIRING_MANAGER: JOB_MANAGER_PERMISSIONS,
  INTERVIEWER: Object.freeze([]),
});

const KNOWN_PERMISSIONS = new Set(Object.values(PERMISSIONS));

export function hasPermission({ role, permission } = {}) {
  if (!APPROVED_ROLES.includes(role) || !KNOWN_PERMISSIONS.has(permission)) {
    return false;
  }

  return ROLE_PERMISSIONS[role].includes(permission);
}
