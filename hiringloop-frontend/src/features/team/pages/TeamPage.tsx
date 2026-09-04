import { useState, type FormEvent, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../shared/components/feedback'
import {
  Badge,
  Button,
  Field,
  Input,
  PageHeader,
  Select,
} from '../../../shared/components/ui'
import { useCurrentUser } from '../../auth/hooks/queries'
import { isApiError } from '../../../shared/lib/apiErrors'
import {
  useInviteMember,
  useChangeMemberRole,
  useRemoveMember,
  useRevokeInvitation,
} from '../hooks/mutations'
import { useInvitations, useMembers } from '../hooks/queries'
import { TEAM_ROLES, type MemberDto, type TeamRole } from '../types/team.types'
import {
  canManageTeam,
  formatDate,
  invitationState,
  ROLE_DESCRIPTIONS,
  roleLabel,
  teamErrorMessage,
} from '../utils/team-utils'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function TeamPage() {
  const { organizationId = '' } = useParams()
  const currentUser = useCurrentUser()
  const members = useMembers(organizationId, Boolean(organizationId))
  const [dialog, setDialog] = useState<{
    kind: 'role' | 'remove' | 'revoke'
    member?: MemberDto
    role?: TeamRole
    invitationId?: string
  } | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamRole>('RECRUITER')
  const [formError, setFormError] = useState('')
  const invitations = useInvitations(organizationId, members.isSuccess)
  const invite = useInviteMember(organizationId)
  const change = useChangeMemberRole(organizationId)
  const remove = useRemoveMember(organizationId)
  const revoke = useRevokeInvitation(organizationId)
  const selfEmail = currentUser.user?.email.toLowerCase()
  const currentMember = members.data?.find(
    (m) => m.user.email.toLowerCase() === selfEmail,
  )
  const allowed = canManageTeam(currentMember?.role)
  function submitInvite(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Enter a valid email address.')
      return
    }
    void invite
      .mutateAsync({ email: email.trim(), role })
      .then(() => {
        setEmail('')
        setInviteOpen(false)
      })
      .catch(() => {})
  }
  if (members.isPending) return <LoadingState label="Loading team" />
  if (
    members.isError &&
    isApiError(members.error) &&
    members.error.status === 403
  )
    return (
      <section className="team-page">
        <ErrorState
          title="Team access unavailable"
          description="You do not have permission to view this workspace team."
        />
      </section>
    )
  if (members.isError)
    return (
      <section className="team-page">
        <ErrorState
          description={teamErrorMessage(
            members.error,
            'We could not load the workspace team.',
          )}
          onRetry={() => void members.refetch()}
        />
      </section>
    )
  if (!allowed)
    return (
      <section className="team-page">
        <ErrorState
          title="Team access unavailable"
          description="You do not have permission to view this workspace team."
        />
      </section>
    )
  const mutationError = invite.isError
    ? teamErrorMessage(invite.error, 'We could not send the invitation.')
    : change.isError
      ? teamErrorMessage(change.error, 'We could not change this role.')
      : remove.isError
        ? teamErrorMessage(remove.error, 'We could not remove this member.')
        : revoke.isError
          ? teamErrorMessage(
              revoke.error,
              'We could not revoke this invitation.',
            )
          : ''
  return (
    <section className="team-page">
      <PageHeader
        title="Team"
        description="Manage people and workspace access"
        actions={
          <Button onClick={() => setInviteOpen(true)}>Invite member</Button>
        }
      />
      {mutationError ? (
        <p className="team-feedback team-feedback--error" role="alert">
          {mutationError}
        </p>
      ) : null}
      {invite.isSuccess ? (
        <p className="team-feedback" role="status">
          Invitation saved for {invite.data.email}.
        </p>
      ) : null}
      {inviteOpen ? (
        <form className="team-invite" onSubmit={submitInvite} noValidate>
          <h2>Invite a member</h2>
          <div className="team-invite__fields">
            <Field id="invite-email" label="Email" required error={formError}>
              {({ describedBy, invalid }) => (
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  autoComplete="email"
                />
              )}
            </Field>
            <Field
              id="invite-role"
              label="Role"
              helperText={ROLE_DESCRIPTIONS[role]}
            >
              {({ describedBy }) => (
                <Select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as TeamRole)}
                  aria-describedby={describedBy}
                >
                  {TEAM_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <div className="team-dialog__actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button loading={invite.isPending} type="submit">
              {invite.isPending ? 'Sending…' : 'Send invitation'}
            </Button>
          </div>
        </form>
      ) : null}
      <TeamSection title="Members">
        <div className="team-table-wrap">
          <table className="team-table">
            <caption className="sr-only">Workspace members</caption>
            <thead>
              <tr>
                <th scope="col">Member / Email</th>
                <th scope="col">Role</th>
                <th scope="col">Joined</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.data.length ? (
                members.data.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    self={member.user.email.toLowerCase() === selfEmail}
                    onRole={(r) => setDialog({ kind: 'role', member, role: r })}
                    onRemove={() => setDialog({ kind: 'remove', member })}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={4}>No members found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </TeamSection>
      <TeamSection title="Pending invitations">
        {invitations.isPending ? (
          <LoadingState label="Loading invitations" />
        ) : invitations.isError ? (
          <ErrorState
            description={teamErrorMessage(
              invitations.error,
              'We could not load invitations.',
            )}
            onRetry={() => void invitations.refetch()}
          />
        ) : invitations.data.length ? (
          <div className="team-table-wrap">
            <table className="team-table">
              <caption className="sr-only">Workspace invitations</caption>
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Expires</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.data.map((i) => {
                  const state = invitationState(i)
                  return (
                    <tr key={i.id}>
                      <td data-label="Email">{i.email}</td>
                      <td data-label="Role">
                        <Badge>{roleLabel(i.role)}</Badge>
                      </td>
                      <td data-label="Expires">{formatDate(i.expiresAt)}</td>
                      <td data-label="Status">{state}</td>
                      <td data-label="Actions">
                        {state === 'Pending' ? (
                          <Button
                            variant="ghost"
                            onClick={() =>
                              setDialog({ kind: 'revoke', invitationId: i.id })
                            }
                          >
                            Revoke
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No pending invitations"
            description="Invitations you send will appear here."
          />
        )}
      </TeamSection>
      {dialog ? (
        <ConfirmDialog
          title={
            dialog.kind === 'role'
              ? `Change ${dialog.member?.user.email}'s role?`
              : dialog.kind === 'remove'
                ? dialog.member?.user.email.toLowerCase() === selfEmail
                  ? 'Leave workspace?'
                  : `Remove ${dialog.member?.user.email}?`
                : 'Revoke this invitation?'
          }
          description={
            dialog.kind === 'role'
              ? `Change ${dialog.member?.user.email} from ${roleLabel(dialog.member!.role)} to ${roleLabel(dialog.role!)}?`
              : dialog.kind === 'remove'
                ? 'This action removes the member from this workspace.'
                : 'The invitation will no longer be usable.'
          }
          confirmLabel={
            dialog.kind === 'role'
              ? 'Change role'
              : dialog.kind === 'remove'
                ? dialog.member?.user.email.toLowerCase() === selfEmail
                  ? 'Leave workspace'
                  : 'Remove member'
                : 'Revoke invitation'
          }
          danger={dialog.kind !== 'role'}
          busy={change.isPending || remove.isPending || revoke.isPending}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            if (dialog.kind === 'role')
              void change
                .mutateAsync({
                  membershipId: dialog.member!.id,
                  role: dialog.role!,
                })
                .then(() => setDialog(null))
                .catch(() => {})
            else if (dialog.kind === 'remove')
              void remove
                .mutateAsync(dialog.member!.id)
                .then(() => setDialog(null))
                .catch(() => {})
            else
              void revoke
                .mutateAsync(dialog.invitationId!)
                .then(() => setDialog(null))
                .catch(() => {})
          }}
        />
      ) : null}
    </section>
  )
}
function TeamSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="team-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
function MemberRow({
  member,
  self,
  onRole,
  onRemove,
}: {
  member: MemberDto
  self: boolean
  onRole: (role: TeamRole) => void
  onRemove: () => void
}) {
  return (
    <tr>
      <td data-label="Member / Email">
        <strong>{member.user.email}</strong>
      </td>
      <td data-label="Role">
        <Badge>{roleLabel(member.role)}</Badge>
      </td>
      <td data-label="Joined">{formatDate(member.joinedAt)}</td>
      <td data-label="Actions">
        <div className="team-actions">
          {' '}
          <label className="sr-only" htmlFor={`role-${member.id}`}>
            Role for {member.user.email}
          </label>
          <Select
            id={`role-${member.id}`}
            value={member.role}
            onChange={(e) => onRole(e.target.value as TeamRole)}
            aria-label={`Change role for ${member.user.email}`}
          >
            {TEAM_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </Select>
          <Button variant="danger" onClick={onRemove}>
            {self ? 'Leave workspace' : 'Remove'}
          </Button>
        </div>
      </td>
    </tr>
  )
}
