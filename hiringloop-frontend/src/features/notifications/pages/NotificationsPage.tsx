import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  PageContainer,
  PageHeader,
} from '../../../shared/components/ui'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../shared/components/feedback'
import { useNotificationMutations } from '../hooks/mutations'
import { useNotificationPreferences, useNotifications } from '../hooks/queries'
import { NotificationRow } from '../components/NotificationBell'
import type {
  NotificationPreferenceDto,
  NotificationType,
} from '../types/notifications.types'
const labels: Record<NotificationType, { title: string; description: string }> =
  {
    CANDIDATE_COMMUNICATION_FAILED: {
      title: 'Candidate email failures',
      description: 'Always enabled so delivery problems are not missed.',
    },
    INTERVIEW_SCHEDULED: {
      title: 'Interview scheduled',
      description: 'When an interview is scheduled for you.',
    },
    INTERVIEW_RESCHEDULED: {
      title: 'Interview rescheduled',
      description: 'When an interview time changes.',
    },
    INTERVIEW_CANCELLED: {
      title: 'Interview cancelled',
      description: 'When an interview is cancelled.',
    },
    SCORECARD_SUBMITTED: {
      title: 'Scorecard submitted',
      description: 'When interview feedback is submitted.',
    },
  }
export function NotificationsPage() {
  const { organizationId = '' } = useParams()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const list = useNotifications(organizationId, page)
  const preferences = useNotificationPreferences(organizationId)
  const mutations = useNotificationMutations(organizationId)
  const markAll = () => mutations.all.mutate()
  const go = (item: import('../types/notifications.types').NotificationDto) => {
    if (!item.readAt) mutations.read.mutate(item.id)
    if (item.applicationId)
      navigate(
        `/app/organizations/${organizationId}/applications/${item.applicationId}`,
      )
    else if (item.interviewId)
      navigate(
        `/app/organizations/${organizationId}/interviews/${item.interviewId}`,
      )
  }
  if (list.isPending) return <LoadingState label="Loading notifications" />
  if (list.isError)
    return (
      <PageContainer width="standard" className="max-w-5xl py-10 lg:py-14">
        <ErrorState
          title="Notifications unavailable"
          description="We could not load your notifications."
          onRetry={() => void list.refetch()}
        />
      </PageContainer>
    )
  const rows = list.data?.data ?? []
  return (
    <PageContainer width="standard" className="max-w-5xl py-10 lg:py-14">
      <PageHeader
        title="Notifications"
        description="Stay up to date with activity in your hiring workspace."
      />
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          disabled={mutations.all.isPending || !rows.some((x) => !x.readAt)}
          loading={mutations.all.isPending}
          onClick={markAll}
        >
          Mark all as read
        </Button>
      </div>
      {rows.length ? (
        <div className="mt-4 grid gap-2" aria-label="Notifications">
          {rows.map((item) => (
            <div key={item.id}>
              <NotificationRow item={item} onRead={() => go(item)} />
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-text-secondary">Page {page}</span>
            <Button
              variant="secondary"
              disabled={rows.length < (list.data?.pagination.pageSize ?? 20)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : (
        <EmptyState
          title="You’re all caught up"
          description="New hiring activity will appear here."
        />
      )}
      <PreferenceSection
        key={organizationId}
        items={preferences.data ?? []}
        loading={preferences.isPending}
        loadError={preferences.isError && !preferences.data}
        onRetryLoad={() => void preferences.refetch()}
        busy={mutations.preferences.isPending}
        error={mutations.preferences.isError}
        saved={mutations.preferences.isSuccess}
        onSave={(items) => mutations.preferences.mutate(items)}
        onRetrySave={() => {
          if (mutations.preferences.variables?.length)
            mutations.preferences.mutate(mutations.preferences.variables)
        }}
      />
    </PageContainer>
  )
}
function PreferenceSection({
  items,
  loading,
  loadError,
  onRetryLoad,
  busy,
  error,
  saved,
  onSave,
  onRetrySave,
}: {
  items: readonly NotificationPreferenceDto[]
  loading: boolean
  loadError: boolean
  onRetryLoad: () => void
  busy: boolean
  error: boolean
  saved: boolean
  onSave: (items: NotificationPreferenceDto[]) => void
  onRetrySave: () => void
}) {
  const [edits, setEdits] = useState<
    Partial<Record<NotificationType, boolean>>
  >({})
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false)
  const values = items.map((item) => ({
    ...item,
    enabled: edits[item.notificationType] ?? item.enabled,
  }))
  const change = (type: NotificationType, enabled: boolean) => {
    if (!items.length || busy || type === 'CANDIDATE_COMMUNICATION_FAILED')
      return
    const next = values.map((item) =>
      item.notificationType === type ? { ...item, enabled } : item,
    )
    setEdits((current) => ({ ...current, [type]: enabled }))
    setHasAttemptedSave(true)
    onSave(next)
  }
  return (
    <section className="mt-10 rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold">Notification preferences</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Choose which informational updates you receive. Missing preferences are
        enabled.
      </p>
      {loading ? (
        <p role="status" className="mt-4 text-sm text-text-secondary">
          Loading preferences…
        </p>
      ) : null}
      {loadError ? (
        <div className="mt-4" role="alert">
          <p className="text-sm text-error">
            We could not load your notification preferences.
          </p>
          <Button className="mt-2" variant="secondary" onClick={onRetryLoad}>
            Try again
          </Button>
        </div>
      ) : null}
      {!loading && !loadError && !items.length ? (
        <p className="mt-4 text-sm text-text-secondary">
          No notification preferences are available.
        </p>
      ) : null}
      {items.length ? (
        <div className="mt-4 grid gap-3">
          {items.map((item) => {
            const info = labels[item.notificationType]
            const mandatory =
              item.notificationType === 'CANDIDATE_COMMUNICATION_FAILED'
            return (
              <label
                key={item.notificationType}
                className="flex items-start gap-3 rounded-control border border-border p-3"
              >
                <input
                  type="checkbox"
                  checked={edits[item.notificationType] ?? item.enabled}
                  disabled={mandatory || busy || loading}
                  onChange={(e) =>
                    change(item.notificationType, e.target.checked)
                  }
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <strong className="block">
                    {info.title}
                    {mandatory ? ' (always enabled)' : ''}
                  </strong>
                  <span className="text-sm text-text-secondary">
                    {info.description}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      ) : null}
      {hasAttemptedSave && busy ? (
        <p role="status" className="mt-3 text-sm text-text-secondary">
          Saving preferences…
        </p>
      ) : null}
      {hasAttemptedSave && saved && !busy ? (
        <p role="status" className="mt-3 text-sm text-success">
          Preferences saved.
        </p>
      ) : null}
      {hasAttemptedSave && error ? (
        <div className="mt-3" role="alert">
          <p className="text-sm text-error">
            Your preference change was not saved. Try again.
          </p>
          <Button
            className="mt-2"
            variant="secondary"
            disabled={busy || !items.length}
            onClick={onRetrySave}
          >
            Retry save
          </Button>
        </div>
      ) : null}
    </section>
  )
}
