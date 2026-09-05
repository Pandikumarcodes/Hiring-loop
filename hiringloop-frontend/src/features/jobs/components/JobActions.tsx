import { MoreHorizontal } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../shared/components/ui'
import type { JobAction } from '../api/jobs.api'
import type { JobListDto } from '../types/job.types'
import { can, jobTitle } from '../utils/job-utils'
export function JobActions({
  job,
  onAction,
  onEdit,
  permissions,
}: {
  job: JobListDto
  onAction: (a: JobAction) => void
  onEdit: () => void
  permissions: readonly string[] | undefined
}) {
  const actions: { label: string; action?: JobAction; edit?: boolean }[] =
    job.status === 'DRAFT'
      ? [
          ...(can(permissions, 'job:update')
            ? [{ label: 'Edit', edit: true }]
            : []),
          ...(can(permissions, 'job:open')
            ? [{ label: 'Open', action: 'open' as const }]
            : []),
          ...(can(permissions, 'job:archive')
            ? [{ label: 'Archive', action: 'archive' as const }]
            : []),
        ]
      : job.status === 'OPEN'
        ? [
            ...(can(permissions, 'job:update')
              ? [{ label: 'Edit', edit: true }]
              : []),
            ...(can(permissions, 'job:close')
              ? [{ label: 'Close', action: 'close' as const }]
              : []),
          ]
        : job.status === 'CLOSED'
          ? [
              ...(can(permissions, 'job:update')
                ? [{ label: 'Edit', edit: true }]
                : []),
              ...(can(permissions, 'job:reopen')
                ? [{ label: 'Reopen', action: 'reopen' as const }]
                : []),
              ...(can(permissions, 'job:archive')
                ? [{ label: 'Archive', action: 'archive' as const }]
                : []),
            ]
          : []
  if (!actions.length)
    return <span className="text-sm text-text-secondary">View only</span>
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-11 px-3"
          aria-label={`Actions for ${jobTitle(job.title)}`}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((a) => (
          <DropdownMenuItem
            key={a.label}
            onSelect={() => (a.edit ? onEdit() : onAction(a.action!))}
          >
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
