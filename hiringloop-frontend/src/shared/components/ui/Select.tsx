import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className = '', ...props }, ref) {
  return (
    <select
      {...props}
      ref={ref}
      className={cn(
        'ui-select h-11 min-w-0 w-full rounded-control border border-border bg-surface px-3 text-sm text-text-primary shadow-sm outline-none focus:border-primary-dark focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    />
  )
})
