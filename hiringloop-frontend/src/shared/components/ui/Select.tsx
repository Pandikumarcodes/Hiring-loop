import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export function Select({
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'ui-select h-11 min-w-0 w-full rounded-control border border-border bg-surface px-3 text-sm text-text-primary shadow-sm outline-none focus:border-primary-dark focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    />
  )
}
