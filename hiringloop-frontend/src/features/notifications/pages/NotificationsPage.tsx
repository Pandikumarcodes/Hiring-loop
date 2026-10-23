import { useState } from 'react'
import { Bell, CheckCheck, Settings2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import {
  Alert,
  Badge,
  Button,
  Card,
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
import { NotificationInboxRow } from '../components/NotificationInboxRow'
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
  return <NotificationCenter key={organizationId} />
}
function NotificationCenter() {
  const { organizationId = '' } = useParams()
  const [page, setPage] = useState(1)
  const list = useNotifications(organizationId, page)
  const preferences = useNotificationPreferences(organizationId)
  const mutations = useNotificationMutations(organizationId)
  const markAll = () => mutations.all.mutate()
  const go = (item: import('../types/notifications.types').NotificationDto) => {
    if (!item.readAt) mutations.read.mutate(item.id)
  }
  const rows = list.data?.data ?? []
  return (
    <PageContainer width="standard">
      <PageHeader
        title="Notifications"
        description="Stay up to date with activity in your hiring workspace."
        actions={
          <Button
            variant="secondary"
            disabled={
              list.isPending ||
              list.isError ||
              mutations.all.isPending ||
              !rows.some((x) => !x.readAt)
            }
            loading={mutations.all.isPending}
            onClick={markAll}
          >
            <CheckCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            Mark all as read
          </Button>
        }
      />
      <Card>
        <section aria-labelledby="notification-inbox-title">
          <div className="flex items-start gap-3 border-b border-border p-4 sm:p-5">
            <Bell
              className="mt-1 h-5 w-5 shrink-0 text-primary-dark"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2
                id="notification-inbox-title"
                className="text-base font-semibold"
              >
                Your inbox
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Interview updates, feedback and candidate email alerts.
              </p>
            </div>
          </div>
          {mutations.all.isError || mutations.read.isError ? (
            <Alert variant="danger" className="m-4">
              We could not mark notifications as read. Please try again.
            </Alert>
          ) : null}
          {list.isPending ? (
            <LoadingState label="Loading notifications" />
          ) : list.isError ? (
            <ErrorState
              title="Notifications unavailable"
              description="We could not load your notifications."
              onRetry={() => void list.refetch()}
            />
          ) : rows.length ? (
            <ul aria-label="Notifications" className="divide-y divide-border">
              {rows.map((item) => (
                <NotificationInboxRow
                  key={item.id}
                  item={item}
                  organizationId={organizationId}
                  onRead={() => go(item)}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              title={
                page === 1 ? 'You are all caught up' : 'No more notifications'
              }
              description={
                page === 1
                  ? 'New hiring activity will appear here.'
                  : 'Return to the previous page to see earlier results.'
              }
            />
          )}
          {!list.isPending && !list.isError && (rows.length > 0 || page > 1) ? (
            <nav
              aria-label="Notification pagination"
              className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4 sm:px-5"
            >
              <Button
                variant="secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span aria-live="polite" className="text-sm text-text-secondary">
                Page {page}
              </span>
              <Button
                variant="secondary"
                disabled={rows.length < (list.data?.pagination.pageSize ?? 20)}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </nav>
          ) : null}
        </section>
      </Card>
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
    <section aria-labelledby="notification-preferences-title" className="mt-8">
      <Card className="p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <Settings2
            className="mt-1 h-5 w-5 shrink-0 text-primary-dark"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2
              id="notification-preferences-title"
              className="text-lg font-semibold"
            >
              Notification preferences
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Choose which updates appear in your inbox. Changes save
              automatically. Missing preferences are enabled.
            </p>
          </div>
        </div>
        {loading ? (
          <p role="status" className="mt-4 text-sm text-text-secondary">
            Loading preferences…
          </p>
        ) : null}
        {loadError ? (
          <Alert variant="danger" className="mt-4">
            <p className="text-sm text-error">
              We could not load your notification preferences.
            </p>
            <Button className="mt-2" variant="secondary" onClick={onRetryLoad}>
              Try again
            </Button>
          </Alert>
        ) : null}
        {!loading && !loadError && !items.length ? (
          <p className="mt-4 text-sm text-text-secondary">
            No notification preferences are available.
          </p>
        ) : null}
        {items.length ? (
          <fieldset disabled={busy || loading} className="mt-6 min-w-0">
            <legend className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              In-app notifications
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {items.map((item) => {
                const info = labels[item.notificationType]
                const mandatory =
                  item.notificationType === 'CANDIDATE_COMMUNICATION_FAILED'
                return (
                  <label
                    key={item.notificationType}
                    className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-control border border-border p-4 transition-colors hover:bg-surface-muted ${mandatory ? 'sm:col-span-2 bg-surface-muted/50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={edits[item.notificationType] ?? item.enabled}
                      disabled={mandatory || busy || loading}
                      onChange={(e) =>
                        change(item.notificationType, e.target.checked)
                      }
                      className="mt-1 h-5 w-5 shrink-0 accent-primary-dark focus-visible:outline-3 focus-visible:outline-primary-dark focus-visible:outline-offset-2"
                    />
                    <span className="min-w-0 text-sm leading-6">
                      <strong className="block font-semibold">
                        {info.title}
                        {mandatory ? (
                          <Badge className="ml-2">Always enabled</Badge>
                        ) : null}
                      </strong>
                      <span className="text-sm text-text-secondary">
                        {info.description}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
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
          <Alert variant="danger" className="mt-4">
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
          </Alert>
        ) : null}
      </Card>
    </section>
  )
}
