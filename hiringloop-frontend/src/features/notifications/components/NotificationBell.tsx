import { Bell } from 'lucide-react'
import { useId } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../shared/components/ui'
import { useNotificationMutations } from '../hooks/mutations'
import { useNotifications, useUnreadCount } from '../hooks/queries'
import type { NotificationDto } from '../types/notifications.types'

function organizationFromPath(path: string) {
  return path.match(/\/organizations\/([^/]+)/)?.[1] ?? ''
}

export function NotificationBell({ enabled = true }: { enabled?: boolean }) {
  const titleId = useId()
  const location = useLocation()
  const navigate = useNavigate()
  const org = organizationFromPath(location.pathname)
  const available = Boolean(org && enabled)
  const count = useUnreadCount(org, available)
  const recent = useNotifications(org, 1, available)
  const mutations = useNotificationMutations(org)

  if (!available) return null

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative"
          aria-label={
            count.data ? `Notifications, ${count.data} unread` : 'Notifications'
          }
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
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        aria-labelledby={titleId}
        className="w-[min(24rem,calc(100vw-2rem))]"
      >
        <p id={titleId} className="px-2 py-1 text-sm font-bold">
          Recent notifications
        </p>
        {recent.isPending ? (
          <p role="status" className="p-2 text-sm text-text-secondary">
            Loading notifications…
          </p>
        ) : recent.isError ? (
          <p role="alert" className="p-2 text-sm text-error">
            We could not load recent notifications.
          </p>
        ) : recent.data?.data.length ? (
          recent.data.data.slice(0, 5).map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              onRead={() => {
                if (!item.readAt) mutations.read.mutate(item.id)
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
          ))
        ) : (
          <p className="p-2 text-sm text-text-secondary">
            You’re all caught up.
          </p>
        )}
        <DropdownMenuItem asChild>
          <Link to={`/app/organizations/${org}/notifications`}>
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
  const content = (
    <>
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
    </>
  )

  if (compact)
    return (
      <DropdownMenuItem onSelect={onRead} className="block h-auto py-3">
        {content}
      </DropdownMenuItem>
    )

  return (
    <article
      className={`rounded-control p-3 ${item.readAt ? '' : 'bg-primary-soft'}`}
    >
      <button
        type="button"
        className="block w-full text-left focus-visible:outline-3 focus-visible:outline-primary-dark"
        onClick={onRead}
      >
        {content}
      </button>
    </article>
  )
}
