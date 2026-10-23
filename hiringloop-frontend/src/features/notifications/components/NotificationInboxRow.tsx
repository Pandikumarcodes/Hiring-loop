import { CalendarDays, ClipboardCheck, MailWarning } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button } from '../../../shared/components/ui'
import type { NotificationDto } from '../types/notifications.types'

export function NotificationInboxRow({
  item,
  organizationId,
  onRead,
}: {
  item: NotificationDto
  organizationId: string
  onRead: () => void
}) {
  const unread = !item.readAt
  const Icon =
    item.type === 'CANDIDATE_COMMUNICATION_FAILED'
      ? MailWarning
      : item.type === 'SCORECARD_SUBMITTED'
        ? ClipboardCheck
        : CalendarDays
  const href = item.applicationId
    ? `/app/organizations/${organizationId}/applications/${item.applicationId}`
    : item.interviewId
      ? `/app/organizations/${organizationId}/interviews/${item.interviewId}`
      : null

  return (
    <li
      className={`flex min-w-0 gap-3 border-l-2 p-4 sm:gap-4 sm:p-5 ${unread ? 'border-l-primary bg-primary-soft/50' : 'border-l-transparent'}`}
    >
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control ${unread ? 'bg-primary-soft text-primary-dark' : 'bg-surface-muted text-text-secondary'}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="min-w-0 text-sm font-semibold leading-6 text-text-primary">
            {href ? (
              <Link
                className="rounded-sm hover:text-primary-dark hover:underline focus-visible:outline-3 focus-visible:outline-primary-dark focus-visible:outline-offset-2"
                to={href}
                onClick={onRead}
              >
                {item.title}
              </Link>
            ) : (
              item.title
            )}
          </h3>
          <Badge
            className={
              unread
                ? 'border-primary/20 bg-primary-soft text-primary-dark'
                : ''
            }
          >
            {unread ? 'Unread' : 'Read'}
          </Badge>
        </div>
        <p className="mt-1 text-sm leading-6 text-text-secondary">
          {item.message}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <time
            dateTime={item.createdAt}
            className="text-xs leading-5 text-text-secondary"
          >
            {new Date(item.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </time>
          {!href && unread ? (
            <Button
              variant="ghost"
              onClick={onRead}
              aria-label={`Mark as read: ${item.title}`}
            >
              Mark as read
            </Button>
          ) : href ? (
            <span className="text-xs text-text-secondary">
              {item.applicationId ? 'View application' : 'View interview'}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  )
}
