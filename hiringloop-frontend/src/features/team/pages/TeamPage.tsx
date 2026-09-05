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
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ErrorState
          title="Team access unavailable"
          description="You do not have permission to view this workspace team."
        />
      </section>
    )
  if (members.isError)
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
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
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
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
    <section className="mx-auto w-full max-w-7xl min-w-0 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <PageHeader
        title="Team"
        description="Manage people and workspace access"
        actions={
          <Button onClick={() => setInviteOpen(true)}>Invite member</Button>
        }
      />
      {mutationError ? (
        <p
          className="rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
          role="alert"
        >
          {mutationError}
        </p>
      ) : null}
      {invite.isSuccess ? (
        <p
          className="rounded-control border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800"
          role="status"
        >
          Invitation saved for {invite.data.email}.
        </p>
      ) : null}
      {inviteOpen ? (
        <form
          className="mb-7 grid gap-4 rounded-card border border-teal-200 bg-primary-soft p-4 shadow-sm sm:p-6"
          onSubmit={submitInvite}
          noValidate
        >
          <h2 className="text-lg font-bold">Invite a member</h2>
          <div className="grid min-w-0 gap-4 md:grid-cols-[1.4fr_1fr]">
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
          <div className="mt-1 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full table-fixed border-collapse">
            <caption className="sr-only">Workspace members</caption>
            <colgroup>
              <col className="w-[42%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[26%]" />
            </colgroup>
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
        <div className="grid gap-3 px-3 pb-3 md:hidden">
          {members.data.length ? (
            members.data.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                self={member.user.email.toLowerCase() === selfEmail}
                onRole={(r) => setDialog({ kind: 'role', member, role: r })}
                onRemove={() => setDialog({ kind: 'remove', member })}
              />
            ))
          ) : (
            <p className="px-1 py-2 text-sm text-text-secondary">
              No members found.
            </p>
          )}
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
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full table-fixed border-collapse">
                <caption className="sr-only">Workspace invitations</caption>
                <colgroup>
                  <col className="w-[34%]" />
                  <col className="w-[16%]" />
                  <col className="w-[18%]" />
                  <col className="w-[16%]" />
                  <col className="w-[16%]" />
                </colgroup>
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
                      <tr
                        className="border-t border-border align-middle"
                        key={i.id}
                      >
                        <td
                          className="break-words px-6 py-4"
                          data-label="Email"
                        >
                          {i.email}
                        </td>
                        <td className="px-6 py-4" data-label="Role">
                          <Badge>{roleLabel(i.role)}</Badge>
                        </td>
                        <td className="px-6 py-4" data-label="Expires">
                          {formatDate(i.expiresAt)}
                        </td>
                        <td className="px-6 py-4" data-label="Status">
                          {state}
                        </td>
                        <td className="px-6 py-4" data-label="Actions">
                          {state === 'Pending' ? (
                            <Button
                              variant="ghost"
                              onClick={() =>
                                setDialog({
                                  kind: 'revoke',
                                  invitationId: i.id,
                                })
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
            <div className="grid gap-3 px-3 pb-3 md:hidden">
              {invitations.data.map((i) => {
                const state = invitationState(i)
                return (
                  <InvitationCard
                    key={i.id}
                    email={i.email}
                    role={roleLabel(i.role)}
                    expires={formatDate(i.expiresAt)}
                    state={state}
                    onRevoke={
                      state === 'Pending'
                        ? () =>
                            setDialog({ kind: 'revoke', invitationId: i.id })
                        : undefined
                    }
                  />
                )
              })}
            </div>
          </>
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
                .catch((error) => {
                  if (isApiError(error) && error.status === 409) setDialog(null)
                })
            else if (dialog.kind === 'remove')
              void remove
                .mutateAsync(dialog.member!.id)
                .then(() => setDialog(null))
                .catch((error) => {
                  if (isApiError(error) && error.status === 409) setDialog(null)
                })
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
    <section className="mt-7 min-w-0 overflow-hidden rounded-card border border-border bg-surface shadow-sm">
      <h2 className="border-b border-border px-4 py-4 text-base font-bold sm:px-6">
        {title}
      </h2>
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
    <tr className="border-t border-border align-middle hover:bg-primary-soft/40 max-md:mx-3 max-md:my-3 max-md:block max-md:rounded-control max-md:border max-md:p-3 max-md:shadow-sm">
      <td
        className="break-words px-6 py-4 max-md:block max-md:px-1 max-md:py-2"
        data-label="Member / Email"
      >
        <strong className="block break-words">{member.user.email}</strong>
      </td>
      <td
        className="px-6 py-4 max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:px-1 max-md:py-2"
        data-label="Role"
      >
        <Badge>{roleLabel(member.role)}</Badge>
      </td>
      <td
        className="px-6 py-4 max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:px-1 max-md:py-2"
        data-label="Joined"
      >
        {formatDate(member.joinedAt)}
      </td>
      <td
        className="px-6 py-4 max-md:block max-md:px-1 max-md:py-2"
        data-label="Actions"
      >
        <div className="flex flex-wrap items-center justify-end gap-2 max-md:mt-2 max-md:grid max-md:w-full">
          <label className="sr-only" htmlFor={`role-${member.id}`}>
            Role for {member.user.email}
          </label>
          <Select
            className="w-auto min-w-32"
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

function MemberCard({
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
    <article className="min-w-0 rounded-control border border-border p-4 shadow-sm">
      <strong className="block break-words text-sm">{member.user.email}</strong>
      <div className="mt-4 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-text-secondary">Role</span>
          <Badge>{roleLabel(member.role)}</Badge>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-text-secondary">Joined</span>
          <span>{formatDate(member.joinedAt)}</span>
        </div>
        <div className="grid gap-2 border-t border-border pt-3">
          <label
            className="text-sm font-bold"
            htmlFor={`mobile-role-${member.id}`}
          >
            Change role
          </label>
          <Select
            id={`mobile-role-${member.id}`}
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
          <Button className="w-full" variant="danger" onClick={onRemove}>
            {self ? 'Leave workspace' : 'Remove'}
          </Button>
        </div>
      </div>
    </article>
  )
}

function InvitationCard({
  email,
  role,
  expires,
  state,
  onRevoke,
}: {
  email: string
  role: string
  expires: string
  state: string
  onRevoke?: () => void
}) {
  return (
    <article className="min-w-0 rounded-control border border-border p-4 shadow-sm">
      <strong className="block break-words text-sm">{email}</strong>
      <dl className="mt-4 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-text-secondary">Role</dt>
          <dd>
            <Badge>{role}</Badge>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-text-secondary">Expires</dt>
          <dd>{expires}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-text-secondary">Status</dt>
          <dd>{state}</dd>
        </div>
      </dl>
      {onRevoke ? (
        <Button className="mt-4 w-full" variant="ghost" onClick={onRevoke}>
          Revoke
        </Button>
      ) : null}
    </article>
  )
}
