import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface FilterToolbarProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  clearAction?: ReactNode
  resultsSummary?: ReactNode
  secondaryActions?: ReactNode
}

export function FilterToolbar({
  children,
  className,
  clearAction,
  resultsSummary,
  secondaryActions,
  ...props
}: FilterToolbarProps) {
  return (
    <div
      role="group"
      aria-label="List filters"
      className="mb-6 min-w-0 rounded-card border border-border bg-surface p-4 shadow-surface"
      {...props}
    >
      <div
        className={cn(
          'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3',
          className,
        )}
      >
        {children}
      </div>
      {resultsSummary || clearAction || secondaryActions ? (
        <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div
            className="min-w-0 text-sm text-text-secondary"
            aria-live="polite"
          >
            {resultsSummary}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {secondaryActions}
            {clearAction}
          </div>
        </div>
      ) : null}
    </div>
  )
}
