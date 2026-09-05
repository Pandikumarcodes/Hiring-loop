import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger'

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
          ' inline-flex rounded-full px-2.5 py-1 text-xs font-bold',
        {
          'bg-slate-100 text-text-primary': variant === 'neutral',
          'bg-emerald-50 text-success': variant === 'success',
          'bg-amber-50 text-amber-800': variant === 'warning',
          'bg-red-50 text-error': variant === 'danger',
        },
        className,
      )}
    >
      {children}
    </span>
  )
}
