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
});

const ADMIN_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));

// Keep this matrix in application code until product and security decisions
// justify database-backed permissions.
export const ROLE_PERMISSIONS = Object.freeze({
  ADMIN: ADMIN_PERMISSIONS,
  RECRUITER: Object.freeze([]),
  HIRING_MANAGER: Object.freeze([]),
  INTERVIEWER: Object.freeze([]),
});

const KNOWN_PERMISSIONS = new Set(Object.values(PERMISSIONS));

export function hasPermission({ role, permission } = {}) {
  if (!APPROVED_ROLES.includes(role) || !KNOWN_PERMISSIONS.has(permission)) {
    return false;
  }

  return ROLE_PERMISSIONS[role].includes(permission);
}
