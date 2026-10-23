import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
}

export function Alert({ className, variant = 'info', ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'min-w-0 rounded-control border px-4 py-3 text-sm leading-6 [overflow-wrap:anywhere]',
        {
          'border-info-border bg-info-soft text-info': variant === 'info',
          'border-success-border bg-success-soft text-success':
            variant === 'success',
          'border-warning-border bg-warning-soft text-warning':
            variant === 'warning',
          'border-error-border bg-error-soft text-error': variant === 'danger',
          'border-neutral-border bg-neutral-soft text-neutral':
            variant === 'neutral',
        },
        className,
      )}
      {...props}
    />
  )
}
