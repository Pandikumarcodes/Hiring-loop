import { describe, expect, test } from 'vitest'
import { teamKeys } from './hooks/query-keys'
import { canManageTeam, invitationState, roleLabel } from './utils/team-utils'

describe('Team frontend boundaries', () => {
  test('keeps team caches isolated by workspace', () => {
    expect(teamKeys.members('workspace-a')).not.toEqual(
      teamKeys.members('workspace-b'),
    )
    expect(teamKeys.invitations('workspace-a')).toEqual([
      'organizations',
      'workspace-a',
      'invitations',
    ])
  })

  test('allows team management only for Admin membership context', () => {
    expect(canManageTeam('ADMIN')).toBe(true)
    expect(canManageTeam('RECRUITER')).toBe(false)
    expect(canManageTeam(undefined)).toBe(false)
  })

  test('uses safe role labels and invitation lifecycle state', () => {
    expect(roleLabel('HIRING_MANAGER')).toBe('Hiring Manager')
    expect(
      invitationState({
        acceptedAt: null,
        revokedAt: '2026-01-01',
        expiresAt: '2099-01-01',
      }),
    ).toBe('Revoked')
  })
})
