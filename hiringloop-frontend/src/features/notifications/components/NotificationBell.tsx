import { Bell } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button, Badge } from '../../../shared/components/ui'
import { useUnreadCount, useNotifications } from '../hooks/queries'
import { useNotificationMutations } from '../hooks/mutations'
import type { NotificationDto } from '../types/notifications.types'
function organizationFromPath(path: string) {
  return path.match(/\/organizations\/([^/]+)/)?.[1] ?? ''
}
export function NotificationBell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const org = organizationFromPath(location.pathname)
  const enabled = Boolean(org)
  const count = useUnreadCount(org, enabled)
  const recent = useNotifications(org, 1, enabled)
  const mutations = useNotificationMutations(org)
  if (!enabled) return null
  return (
    <div className="relative">
      <Button
        variant="ghost"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          count.data ? `Notifications, ${count.data} unread` : 'Notifications'
        }
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {count.data ? (
          <Badge
            className="absolute -right-1 -top-1 min-w-5 justify-center px-1.5 py-0.5"
            variant="danger"
          >
            <span aria-hidden="true">
              {count.data > 99 ? '99+' : count.data}
            </span>
            <span className="sr-only">{count.data} unread</span>
          </Badge>
        ) : null}
      </Button>
      <div
        hidden={!open}
        role="dialog"
        aria-label="Recent notifications"
        className="absolute right-0 top-12 z-40 w-[min(24rem,calc(100vw-2rem))] rounded-card border border-border bg-surface p-3 shadow-xl"
      >
        <h2 className="px-2 py-1 text-sm font-bold">Recent notifications</h2>
        {recent.data?.data.slice(0, 5).map((item) => (
          <NotificationRow
            key={item.id}
            item={item}
            onRead={() => {
              if (!item.readAt) mutations.read.mutate(item.id)
              setOpen(false)
              if (item.applicationId)
                navigate(
                  `/app/organizations/${org}/applications/${item.applicationId}`,
                )
              else if (item.interviewId)
                navigate(
                  `/app/organizations/${org}/interviews/${item.interviewId}`,
                )
            }}
            compact
          />
        ))}
        {!recent.data?.data.length ? (
          <p className="p-2 text-sm text-text-secondary">
            You’re all caught up.
          </p>
        ) : null}
        <Link
          className="mt-2 block rounded-control px-2 py-2 text-sm font-bold text-primary-dark hover:bg-primary-soft"
          to={`/app/organizations/${org}/notifications`}
        >
          View all notifications
        </Link>
      </div>
    </div>
  )
}
export function NotificationRow({
  item,
  onRead,
  compact = false,
}: {
  item: NotificationDto
  onRead: () => void
  compact?: boolean
}) {
  return (
    <article
      className={`rounded-control p-3 ${item.readAt ? '' : 'bg-primary-soft'}`}
    >
      <button
        type="button"
        className="block w-full text-left focus-visible:outline-3 focus-visible:outline-primary-dark"
        onClick={onRead}
      >
        <span className="flex items-start justify-between gap-2">
          <strong className="text-sm">{item.title}</strong>
          {!item.readAt ? (
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
              aria-label="Unread"
            />
          ) : null}
        </span>
        <span className="mt-1 block text-sm text-text-secondary">
          {item.message}
        </span>
        <span className="mt-1 block text-xs text-text-secondary">
          {new Date(item.createdAt).toLocaleString()}
        </span>
      </button>
      {!compact && item.readAt ? null : null}
    </article>
  )
}
