import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
}

export function Badge({
  children,
  variant = 'neutral',
  className,
}: BadgeProps & { className?: string }) {
  return (
    <span
      className={cn(
        'ui-badge ui-badge--' +
          variant +
          ' inline-flex min-w-0 max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-4 [overflow-wrap:anywhere]',
        {
          'border-neutral-border bg-neutral-soft text-neutral':
            variant === 'neutral',
          'border-success-border bg-success-soft text-success':
            variant === 'success',
          'border-warning-border bg-warning-soft text-warning':
            variant === 'warning',
          'border-error-border bg-error-soft text-error': variant === 'danger',
          'border-info-border bg-info-soft text-info': variant === 'info',
        },
        className,
      )}
    >
      {children}
    </span>
  )
}
