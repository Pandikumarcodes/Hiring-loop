import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface DataTableShellProps {
  caption: string
  children: ReactNode
  className?: string
  tableClassName?: string
}

export function DataTableShell({
  caption,
  children,
  className,
  tableClassName,
}: DataTableShellProps) {
  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className={cn(
        'ui-table-scroll relative hidden min-w-0 overflow-x-auto rounded-card border border-border bg-surface shadow-surface xl:block',
        className,
      )}
    >
      <table
        className={cn(
          'ui-data-table w-full min-w-[48rem] text-left text-sm',
          tableClassName,
        )}
      >
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  )
}
